import { hardhatConfig } from '@api3/chains';
import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-deploy';
import 'dotenv/config';

const config: HardhatUserConfig = {
  etherscan: hardhatConfig.etherscan(),
  networks: hardhatConfig.networks(),
  solidity: {
    compilers: [
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
    ],
  },
};

// eslint-disable-next-line import/no-default-export
export default config;
