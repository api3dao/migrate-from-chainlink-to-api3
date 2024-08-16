// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {AggregatorV2V3Interface} from "./vendor/AggregatorV2V3Interface.sol";

/// @title API3 feed proxy contract interface
interface IProxy {
    function read() external view returns (int224 value, uint32 timestamp);
}

/// @title Contract for migrating from using Chainlink to API3 data feeds
/// @notice This contract wraps an API3 feed proxy contract and implements
/// AggregatorV2V3Interface. By deploying this contract with the appropriate
/// API3 feed proxy address (refer to https://market.api3.org/), you can use it
/// as if it is a Chainlink feed contract.
/// @dev API3 feed proxies are deployed deterministically and their addresses
/// can be derived using the npm package (at)api3/contracts. This contract is
/// recommended to be deployed deterministically for its address to be easily
/// verifiable as well.
contract Api3ProxyToAggregatorV2V3Interface is AggregatorV2V3Interface {
    error Api3ProxyAddressISZero();

    error RoundIdIsNotCurrent();

    error BlockNumberIsNotCastableToUint80();

    /// @notice API3 feed proxy address
    address public immutable api3Proxy;

    /// @param api3Proxy_ API3 feed proxy address
    constructor(address api3Proxy_) {
        if (api3Proxy_ == address(0)) {
            revert Api3ProxyAddressISZero();
        }
        api3Proxy = api3Proxy_;
    }

    function latestAnswer() external view override returns (int256 value) {
        (value, ) = IProxy(api3Proxy).read();
    }

    /// @dev A Chainlink feed contract returns the block timestamp at which the
    /// feed was last updated. On the other hand, an API3 feed timestamp
    /// denotes the point in time at which the first-party oracles signed the
    /// data used to do the last update. We find that to be a reasonable
    /// approximation in the case that it is being used to check if the last
    /// update is stale.
    /// An important point to note is that in the case that the proxy reads a
    /// dAPI (i.e., a name that is pointed to a Beacon or Beacon set), pointing
    /// the dAPI to another feed that has been updated less recently would
    /// result in this function to return a smaller value than it once did.
    /// Therefore, if your contract depends on what `latestTimestamp()` returns
    /// to never decrease, you are recommended to use an alternative adapter
    /// (e.g., one that returns `block.timestamp` here).
    function latestTimestamp()
        external
        view
        override
        returns (uint256 timestamp)
    {
        (, timestamp) = IProxy(api3Proxy).read();
    }

    /// @dev Since API3 feeds do not have a concept of rounds, we return the
    /// block number as an alternative that is similarly guraanteed to never
    /// decrease.
    /// An important point to note is that this may cause two different feed
    /// values to be read with the same round ID, for example, if the feed is
    /// read, updated, and read again in the same block. Therefore, if your
    /// contract depends on values read with a specific round ID to be
    /// identical, you are recommended to use an alternative adapter (e.g., one
    /// that keeps the round ID in a counter that gets incremented every time
    /// the feed is read).
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
    /// Api3ProxyToAggregatorV2V3Interface
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
        answeredInRound = uint80(block.number);
    }
}
