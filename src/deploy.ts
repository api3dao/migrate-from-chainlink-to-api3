import * as ethers from 'ethers';

import { Api3ProxyToAggregatorV2V3Interface__factory } from '../typechain-types';

// https://github.com/Arachnid/deterministic-deployment-proxy/tree/be3c5974db5028d502537209329ff2e730ed336c#proxy-address
const CREATE2_FACTORY_ADDRESS = '0x4e59b44847b379578588920cA78FbF26c0B4956C';
const SALT = ethers.ZeroHash;

function getDeterministicDeploymentAddress(proxyAddress: ethers.AddressLike) {
  return ethers.getCreate2Address(CREATE2_FACTORY_ADDRESS, SALT, ethers.keccak256(getInitcode(proxyAddress)));
}

function getInitcode(proxyAddress: ethers.AddressLike) {
  return ethers.concat([
    Api3ProxyToAggregatorV2V3Interface__factory.bytecode,
    ethers.AbiCoder.defaultAbiCoder().encode(['address'], [proxyAddress]),
  ]);
}

export { CREATE2_FACTORY_ADDRESS, SALT, getDeterministicDeploymentAddress, getInitcode };
