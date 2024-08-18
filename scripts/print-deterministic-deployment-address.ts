import * as deploy from '../src/deploy';

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error('Environment variable PROXY_ADDRESS is not defined');
  }
  const api3PartialAggregatorV2V3InterfaceAddress = deploy.getDeterministicDeploymentAddress(proxyAddress);
  console.log(
    `Api3PartialAggregatorV2V3Interface for ${proxyAddress} is expected to be deployed at ${api3PartialAggregatorV2V3InterfaceAddress}`
  );
}

/* eslint-disable */
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
