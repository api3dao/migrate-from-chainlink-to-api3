import { ethers } from 'hardhat';

import * as deploy from '../src/deploy';

async function main() {
  if ((await ethers.provider.getCode(deploy.CREATE2_FACTORY_ADDRESS)) === '0x') {
    throw new Error(
      `CREATE2 factory at ${deploy.CREATE2_FACTORY_ADDRESS} is not deployed. Please refer to https://github.com/Arachnid/deterministic-deployment-proxy/`
    );
  }
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error('Environment variable PROXY_ADDRESS is not defined');
  }
  const api3ProxyToAggregatorV2V3InterfaceAddress = deploy.getDeterministicDeploymentAddress(proxyAddress);
  if ((await ethers.provider.getCode(api3ProxyToAggregatorV2V3InterfaceAddress)) === '0x') {
    const [deployer] = await ethers.getSigners();
    const receipt = await deployer!.sendTransaction({
      to: deploy.CREATE2_FACTORY_ADDRESS,
      data: ethers.concat([deploy.SALT, deploy.getInitcode(proxyAddress)]),
    });
    await new Promise<void>((resolve) =>
      ethers.provider.once(receipt.hash, () => {
        resolve();
      })
    );
    console.log(
      `Api3ProxyToAggregatorV2V3Interface for ${proxyAddress} is deployed at ${api3ProxyToAggregatorV2V3InterfaceAddress} of ${hre.network.name}`
    );
  } else {
    console.log(
      `Api3ProxyToAggregatorV2V3Interface for ${proxyAddress} was already deployed at ${api3ProxyToAggregatorV2V3InterfaceAddress} of ${hre.network.name}`
    );
  }
}

/* eslint-disable */
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
