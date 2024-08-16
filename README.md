# Migration Guide from Chainlink to API3

dApps migrate from using Chainlink feeds to API3 feeds for various reasons, such as:

- API3 data feeds are trust-minimized due to being based on first-party oracles, while alternatives rely on middlemen (Chainlink node operators, Wormhole validators, etc.) in addition to the data sources
- [API3 Market](https://market.api3.org/) has excellent chain coverage and enables feeds to be spun up immediately in an on-demand manner, which often makes API3 the only option that provides managed feeds
- API3 allows dApps to recoup the value they otherwise would have bled as MEV through the OEV mechanism, effectively providing dApps an entirely new revenue source

A dApp can be designed to read a Chainlink feed in two ways:

- The Chainlink feed interface is baked into the dApp
- The Chainlink feed interface is integrated to the dApp through an adapter contract

Both alternatives can be migrated to using an API3 feed instead through the adapter contract provided in this repo.

## Differences between API3 and Chainlink feed interfaces

There are many architectural, protocol-related and operational differences between Chainlink and API3 feeds.
For brevity, we will focus on the differences between the interfaces.

### API3 interface

The API3 feed interface is simply

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IProxy {
  function read() external view returns (int224 value, uint32 timestamp);
}
```

Let us reiterate the related contract docstrings:

> The proxy contracts are generalized to support most types of numerical data feeds.
> This means that the user of this proxy is expected to validate the read values according to the specific use-case.
> For example, `value` is a signed integer, yet it being negative may not make sense in the case that the data feed represents the spot price of an asset.
> In that case, the user is responsible with ensuring that `value` is not negative.

> In the case that the data feed is from a single source, `timestamp` is the system time of the Airnode when it signed the data.
> In the case that the data feed is from multiple sources, `timestamp` is the median of system times of the Airnodes when they signed the respective data.
> There are two points to consider while using `timestamp` in your contract logic:
>
> 1. It is based on the system time of the Airnodes, and not the block timestamp.
>    This may be relevant when either of them drifts.
> 2. `timestamp` is an off-chain value that is being reported, similar to `value`.
>    Both should only be trusted as much as the Airnodes that report them.

> Try to be strict about validations, but be wary of:
>
> 1. Overly strict validation that may invalidate valid values
> 2. Mutable validation parameters that are controlled by a trusted party (which eliminate the trust-minimization guarantees of first-party oracles)
> 3. Validation parameters that need to be tuned according to external conditions.
>    If these are not maintained as intended, the result will be equivalent to (1).
>    Look up the Venus Protocol exploit as a result of the LUNA feed malfunction as an example.

### Chainlink interfaces

At the time of writing this, Chainlink supports two interfaces and a combination of them:

- [AggregatorInterface](./vendor/AggregatorInterface.sol) (can also be thought of as AggregatorInterfaceV2)
- [AggregatorV3Interface](./vendor/AggregatorV3Interface.sol)
- [AggregatorV2V3Interface](./vendor/AggregatorV2V3Interface.sol)

There are two important points here:

1. Chainlink feeds are updated in rounds, and as such, the interface refers to a `roundId`.
   According to the documentation: > Data feeds are updated in rounds.
   Rounds are identified by their `roundId`, which increases with each new round.
   This increase may not be monotonic.
2. Chainlink feeds allow past updates to be queried.

### Potential incompatibilities

There are two main reasons for incompatibilities:

1. If the dApp depends on `roundId` increasing with every feed update
1. If the dApp depends on being able to query past updates with `getRoundData()` of AggregatorV3Interface

Our observation is that almost all dApps only use the feed value, either using `latestAnswer()` of AggregatorInterface, or `answer` returned by `latestRoundData()` of AggregatorV3Interface, in which case API3 feeds will be perfectly compatible.
Furthermore, the adapter contract we provide in this repo makes a best effort in returning sane approximations for the rest of the values.
If your contract utilizes values other than the answer, you are strongly recommended to make sure that these approximations will not cause any issues.
