# Migration Guide from Chainlink to API3 Feeds

dApps that are using Chainlink feeds may want to switch to API3 for reasons such as:

- API3 feeds are trust-minimized due to being based on first-party oracles, while alternatives have middlemen (Chainlink node operators, Wormhole validators, etc.) as a point of failure in addition to the data sources.
- API3 allows dApps to recoup the value they otherwise would have bled as MEV through the OEV mechanism, effectively providing dApps an entirely new revenue source.

In addition, it is a common need for a dApp that is designed to use Chainlink feeds to be deployed on a chain that Chainlink does not (adequately) support.
[API3 Market](https://market.api3.org/) has excellent chain coverage and enables feeds to be spun up in an on-demand manner, which often makes API3 feeds the only managed alternative in such cases.

A dApp can be designed to read a Chainlink feed in two ways:

- The Chainlink feed interface is baked into the dApp.
- The Chainlink feed interface is integrated into the dApp through an adapter contract.

Both alternatives can be migrated to using an API3 feed instead through the Api3PartialAggregatorV2V3Interface contract provided in this repo.

## Instructions

1.  Install the dependencies and build.

    ```sh
    yarn && yarn build
    ```

2.  Create a `.env` file similar to `example.env` with the mnemonic of the wallet that you will use to deploy Api3PartialAggregatorV2V3Interface.

3.  Use [API3 Market](https://market.api3.org/) to find the API3 feed you want to use.

4.  Get the address of the proxy contract that belongs to the feed.
    For example, clicking the Integrate button at https://market.api3.org/polygon/eth-usd displays the proxy address `0x98643CB1BDA4060d8BD2dc19bceB0acF6F03ae17`.

5.  Deploy the Api3PartialAggregatorV2V3Interface that wraps this proxy.
    (Note that `NETWORK` is identical to what is in the Market URL.)

    ```sh
    NETWORK=polygon PROXY_ADDRESS=0x98643CB1BDA4060d8BD2dc19bceB0acF6F03ae17 yarn deploy-deterministically
    ```

You can also just print the expected address after deployment.

```sh
PROXY_ADDRESS=0x98643CB1BDA4060d8BD2dc19bceB0acF6F03ae17 yarn print-deterministic-deployment-address
```

You can flatten the contract to verify it on a block explorer.

```sh
yarn flatten
```

## Differences between API3 and Chainlink feed interfaces

There are many architectural, protocol-related and operational differences between Chainlink and API3 feeds.
For brevity, we will focus on the differences between the interfaces.

### API3 feed interface

The API3 feed interface is simply

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IProxy {
  function read() external view returns (int224 value, uint32 timestamp);
}
```

Let us reiterate the related contract docstrings:

> The proxy contracts are generalized to support most types of numerical feeds.
> This means that the user of this proxy is expected to validate the read values according to the specific use-case.
> For example, `value` is a signed integer, yet it being negative may not make sense in the case that the feed represents the spot price of an asset.
> In that case, the user is responsible with ensuring that `value` is not negative.
>
> In the case that the feed is from a single source, `timestamp` is the system time of the Airnode (API3's first-party oracle node) when it signed the data.
> In the case that the feed is from multiple sources, `timestamp` is the median of system times of the Airnodes when they signed the respective data.
> There are two points to consider while using `timestamp` in your contract logic:
>
> 1. It is based on the system time of the Airnodes, and not the block timestamp.
>    This may be relevant when either of them drifts.
> 2. `timestamp` is an off-chain value that is being reported, similar to `value`.
>    Both should only be trusted as much as the Airnodes that report them.
>
> Try to be strict about validations, but be wary of:
>
> 1. Overly strict validation that may invalidate valid values.
> 2. Mutable validation parameters that are controlled by a trusted party (which eliminate the trust-minimization guarantees of first-party oracles).
> 3. Validation parameters that need to be tuned according to external conditions.
>    If these are not maintained as intended, the result will be equivalent to (1).
>    Look up the Venus Protocol exploit as a result of the LUNA feed malfunction as an example.

### Chainlink feed interfaces

At the time of writing this, Chainlink supports two interfaces and a combination of them:

- [AggregatorInterface](./contracts/vendor/AggregatorInterface.sol) (can also be thought of as AggregatorInterfaceV2)
- [AggregatorV3Interface](./contracts/vendor/AggregatorV3Interface.sol)
- [AggregatorV2V3Interface](./contracts/vendor/AggregatorV2V3Interface.sol)

There are two important points to note:

1. Chainlink feeds are updated in rounds, and as such, their interface refers to a `roundId`.
   According to the documentation:
   > Data feeds are updated in rounds.
   > Rounds are identified by their `roundId`, which increases with each new round.
   > This increase may not be monotonic.
2. Chainlink feeds support past updates to be queried.

## When to use Api3PartialAggregatorV2V3Interface

Api3PartialAggregatorV2V3Interface should be used as is when the following apply:

- The dApp mainly depends on the current feed value (`latestAnswer()` of AggregatorInterface or `answer` returned by `latestRoundData()` of AggregatorV3Interface).
- If the dApp uses the current feed timestamp (`latestTimestamp()` of AggregatorInterface or `updatedAt` returned by `latestRoundData()` of AggregatorV3Interface), it is only for a staleness check, e.g., to check if the feed has been updated in the last heartbeat interval.
- If any other values are used, they do not affect the contract or off-chain infrastructure logic.
  For example, the dApp only emits `roundId` in an event, and strictly for logging purposes.
- The off-chain infrastructure does not depend on the events defined in AggregatorInterface.

In contrast, Api3PartialAggregatorV2V3Interface should not be used as is, and a more specialized adapter contract should be implemented if any of the following applies:

- The dApp logic depends on Chainlink feed idiosyncrasies, such as the round ID increasing with every update.
- The dApp depends on being able to query past updates using `getAnswer()` or `getTimestamp()` of AggregatorInterface, or `getRoundData()` of AggregatorV3Interface.
- The off-chain infrastructure depends on the events defined in AggregatorInterface.

### Specialized adapter contracts

An adapter that simulates all Chainlink feed idiosyncrasies would need to create a new round each time its latest values are read and emit the respective events.
For example, `roundId` can be a storage variable that gets incremented each time a function starting with `latest-` is called, during which the respective value and timestamp would also be stored and the event would be emitted.
Furthermore, users that are planning to refer to a round in the past would need to ensure that such a round has been created by sending a transaction that calls any of the functions that starts with `latest-` at the respective point in time.

Another inconsistency in behavior is that Api3PartialAggregatorV2V3Interface does not guarantee that the timestamp of a feed will never decrease.
For example, in the case that the data sources of an API3 feed are updated to a new set whose latest updates are less recent, the feed timestamp will decrease.
If the dApp depends on the feed timestamps to never decrease, `block.timestamp` can be used as the latest timestamp returned by the feed.

For gas optimization, specialized adapter contracts should simulate Chainlink feed idiosyncrasies only to the extent necessary.
The development of such alternative adapter contracts is beyond the scope of this repo.
