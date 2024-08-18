// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {AggregatorV2V3Interface} from "./vendor/AggregatorV2V3Interface.sol";

/// @title API3 feed proxy contract interface
interface IProxy {
    function read() external view returns (int224 value, uint32 timestamp);
}

/// @title Contract for migrating from Chainlink to API3 Feeds
/// @notice This contract wraps an API3 feed proxy contract and approximates
/// AggregatorV2V3Interface so that it can be treated as a Chainlink feed
/// contract. Please refer to the
/// https://github.com/api3dao/migrate-from-chainlink-to-api3 README for
/// guidance about if the approximation is sufficient for a specific use-case.
contract Api3ProxyToAggregatorV2V3Interface is AggregatorV2V3Interface {
    error Api3ProxyAddressIsZero();

    error RoundIdIsNotCurrent();

    error BlockNumberIsNotCastableToUint80();

    /// @notice API3 feed proxy address
    address public immutable api3Proxy;

    /// @param api3Proxy_ API3 feed proxy address
    constructor(address api3Proxy_) {
        if (api3Proxy_ == address(0)) {
            revert Api3ProxyAddressIsZero();
        }
        api3Proxy = api3Proxy_;
    }

    /// @dev It is assumed that the contract calling this function validates
    /// the value they get from AggregatorV2V3Interface, e.g., by checking if
    /// it is a positive value if it is supposed to represent the spot price of
    /// an asset. Therefore, this contract does not do any validation and
    /// leaves that responsibility to the caller.
    function latestAnswer() external view override returns (int256 value) {
        (value, ) = IProxy(api3Proxy).read();
    }

    /// @dev A Chainlink feed contract returns the block timestamp at which the
    /// feed was last updated. On the other hand, an API3 feed timestamp
    /// denotes the point in time at which the first-party oracles signed the
    /// data used to do the last update. We find this to be a reasonable
    /// approximation in the case that the timestamp is being used to check if
    /// the last update is stale.
    function latestTimestamp()
        external
        view
        override
        returns (uint256 timestamp)
    {
        (, timestamp) = IProxy(api3Proxy).read();
    }

    /// @dev Since API3 feeds do not have the concept of rounds, we return the
    /// block number as a replacement that is guaranteed to never decrease.
    function latestRound() external view override returns (uint256) {
        return block.number;
    }

    /// @dev API3 feeds do not allow historical values to be queried. However,
    /// instead of having this function revert altogether, we allow it to query
    /// the current value.
    function getAnswer(uint256 roundId) external view returns (int256 value) {
        if (roundId != block.number) {
            revert RoundIdIsNotCurrent();
        }
        (value, ) = IProxy(api3Proxy).read();
    }

    /// @dev Similar to `getAnswer()`, we allow `getTimestamp()` to query the
    /// current timestamp.
    function getTimestamp(
        uint256 roundId
    ) external view returns (uint256 timestamp) {
        if (roundId != block.number) {
            revert RoundIdIsNotCurrent();
        }
        (, timestamp) = IProxy(api3Proxy).read();
    }

    /// @dev API3 feeds always use 18 decimals.
    function decimals() external pure override returns (uint8) {
        return 18;
    }

    /// @dev The deterministic proxy address acts as the description, and this
    /// is left empty to save gas on contract deployment.
    function description() external pure override returns (string memory) {
        return "";
    }

    /// @dev A unique version is chosen to easily check if an unverified
    /// contract that acts as a Chainlink feed is an
    /// Api3ProxyToAggregatorV2V3Interface.
    function version() external pure override returns (uint256) {
        return 4913;
    }

    /// @dev Similar to `getAnswer()` and `getTimestamp()`, we allow
    /// `getRoundData()` to query the current value.
    function getRoundData(
        uint80 _roundId
    )
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        if (_roundId != block.number) {
            revert RoundIdIsNotCurrent();
        }
        roundId = _roundId;
        (answer, startedAt) = IProxy(api3Proxy).read();
        updatedAt = startedAt;
        answeredInRound = _roundId;
    }

    /// @dev Similar to `latestAnswer()`, we leave the validation of the
    /// returned value to the caller.
    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        if (block.number > type(uint80).max) {
            revert BlockNumberIsNotCastableToUint80();
        }
        roundId = uint80(block.number);
        (answer, startedAt) = IProxy(api3Proxy).read();
        updatedAt = startedAt;
        answeredInRound = roundId;
    }
}
