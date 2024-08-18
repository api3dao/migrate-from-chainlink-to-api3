import * as helpers from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('DapiProxy', function () {
  async function deploy() {
    const [deployer] = await ethers.getSigners();

    const MockProxy = await ethers.getContractFactory('MockProxy', deployer);
    const mockProxy = await MockProxy.deploy(ethers.getAddress(ethers.hexlify(ethers.randomBytes(20))));
    await mockProxy.mock(123, 456);

    const Api3PartialAggregatorV2V3Interface = await ethers.getContractFactory(
      'Api3PartialAggregatorV2V3Interface',
      deployer
    );
    const api3PartialAggregatorV2V3Interface = await Api3PartialAggregatorV2V3Interface.deploy(
      mockProxy.getAddress()
    );

    return {
      deployer,
      mockProxy,
      api3PartialAggregatorV2V3Interface,
    };
  }

  describe('constructor', function () {
    context('Proxy address is not zero', function () {
      it('constructs', async function () {
        const { mockProxy, api3PartialAggregatorV2V3Interface } = await helpers.loadFixture(deploy);
        expect(await api3PartialAggregatorV2V3Interface.api3Proxy()).to.equal(await mockProxy.getAddress());
      });
    });
    context('Proxy address is zero', function () {
      it('reverts', async function () {
        const { deployer } = await helpers.loadFixture(deploy);
        const Api3PartialAggregatorV2V3Interface = await ethers.getContractFactory(
          'Api3PartialAggregatorV2V3Interface',
          deployer
        );
        await expect(Api3PartialAggregatorV2V3Interface.deploy(ethers.ZeroAddress))
          .to.be.revertedWithCustomError(Api3PartialAggregatorV2V3Interface, 'Api3ProxyAddressIsZero')
          .withArgs();
      });
    });
  });

  describe('latestAnswer', function () {
    it('returns proxy value', async function () {
      const { mockProxy, api3PartialAggregatorV2V3Interface } = await helpers.loadFixture(deploy);
      const [value] = await mockProxy.read();
      expect(await api3PartialAggregatorV2V3Interface.latestAnswer()).to.be.equal(value);
    });
  });

  describe('latestTimestamp', function () {
    it('returns proxy value', async function () {
      const { mockProxy, api3PartialAggregatorV2V3Interface } = await helpers.loadFixture(deploy);
      const [, timestamp] = await mockProxy.read();
      expect(await api3PartialAggregatorV2V3Interface.latestTimestamp()).to.be.equal(timestamp);
    });
  });

  describe('latestRound', function () {
    it('returns block number', async function () {
      const { api3PartialAggregatorV2V3Interface } = await helpers.loadFixture(deploy);
      expect(await api3PartialAggregatorV2V3Interface.latestRound()).to.equal(
        await ethers.provider.getBlockNumber()
      );
    });
  });

  describe('getAnswer', function () {
    context('Round ID is the block number', function () {
      it('returns proxy value', async function () {
        const { mockProxy, api3PartialAggregatorV2V3Interface } = await helpers.loadFixture(deploy);
        const blockNumber = await ethers.provider.getBlockNumber();
        const [value] = await mockProxy.read();
        expect(await api3PartialAggregatorV2V3Interface.getAnswer(blockNumber)).to.be.equal(value);
      });
    });
    context('Round ID is not the block number', function () {
      it('reverts', async function () {
        const { api3PartialAggregatorV2V3Interface } = await helpers.loadFixture(deploy);
        const blockNumber = await ethers.provider.getBlockNumber();
        await expect(api3PartialAggregatorV2V3Interface.getAnswer(blockNumber - 1))
          .to.be.revertedWithCustomError(api3PartialAggregatorV2V3Interface, 'RoundIdIsNotCurrent')
          .withArgs();
      });
    });
  });

  describe('getTimestamp', function () {
    context('Round ID is the block number', function () {
      it('returns proxy timestamp', async function () {
        const { mockProxy, api3PartialAggregatorV2V3Interface } = await helpers.loadFixture(deploy);
        const blockNumber = await ethers.provider.getBlockNumber();
        const [, timestamp] = await mockProxy.read();
        expect(await api3PartialAggregatorV2V3Interface.getTimestamp(blockNumber)).to.be.equal(timestamp);
      });
    });
    context('Round ID is not the block number', function () {
      it('reverts', async function () {
        const { api3PartialAggregatorV2V3Interface } = await helpers.loadFixture(deploy);
        const blockNumber = await ethers.provider.getBlockNumber();
        await expect(api3PartialAggregatorV2V3Interface.getTimestamp(blockNumber - 1))
          .to.be.revertedWithCustomError(api3PartialAggregatorV2V3Interface, 'RoundIdIsNotCurrent')
          .withArgs();
      });
    });
  });

  describe('decimals', function () {
    it('returns 18', async function () {
      const { api3PartialAggregatorV2V3Interface } = await helpers.loadFixture(deploy);
      expect(await api3PartialAggregatorV2V3Interface.decimals()).to.equal(18);
    });
  });

  describe('description', function () {
    it('returns empty string', async function () {
      const { api3PartialAggregatorV2V3Interface } = await helpers.loadFixture(deploy);
      expect(await api3PartialAggregatorV2V3Interface.description()).to.equal('');
    });
  });

  describe('version', function () {
    it('returns 4913', async function () {
      const { api3PartialAggregatorV2V3Interface } = await helpers.loadFixture(deploy);
      expect(await api3PartialAggregatorV2V3Interface.version()).to.equal(4913);
    });
  });

  describe('getRoundData', function () {
    context('Round ID is the block number', function () {
      it('returns approximated round data', async function () {
        const { mockProxy, api3PartialAggregatorV2V3Interface } = await helpers.loadFixture(deploy);
        const blockNumber = await ethers.provider.getBlockNumber();
        const [value, timestamp] = await mockProxy.read();
        const [roundId, answer, startedAt, updatedAt, answeredInRound] =
          await api3PartialAggregatorV2V3Interface.getRoundData(blockNumber);
        expect(roundId).to.equal(blockNumber);
        expect(answer).to.equal(value);
        expect(startedAt).to.equal(timestamp);
        expect(updatedAt).to.equal(timestamp);
        expect(answeredInRound).to.equal(blockNumber);
      });
    });
    context('Round ID is not the block number', function () {
      it('reverts', async function () {
        const { api3PartialAggregatorV2V3Interface } = await helpers.loadFixture(deploy);
        const blockNumber = await ethers.provider.getBlockNumber();
        await expect(api3PartialAggregatorV2V3Interface.getRoundData(blockNumber - 1))
          .to.be.revertedWithCustomError(api3PartialAggregatorV2V3Interface, 'RoundIdIsNotCurrent')
          .withArgs();
      });
    });
  });

  describe('latestRoundData', function () {
    context('Block number is castable to uint80', function () {
      it('returns approximated round data', async function () {
        const { mockProxy, api3PartialAggregatorV2V3Interface } = await helpers.loadFixture(deploy);
        const blockNumber = await ethers.provider.getBlockNumber();
        const [value, timestamp] = await mockProxy.read();
        const [roundId, answer, startedAt, updatedAt, answeredInRound] =
          await api3PartialAggregatorV2V3Interface.latestRoundData();
        expect(roundId).to.equal(blockNumber);
        expect(answer).to.equal(value);
        expect(startedAt).to.equal(timestamp);
        expect(updatedAt).to.equal(timestamp);
        expect(answeredInRound).to.equal(blockNumber);
      });
    });
    // Hardhat does not support block numbers larger than uint64
    /*
    context('Block number is not castable to uint80', function () {
      it('reverts', async function () {
        const { api3PartialAggregatorV2V3Interface } = await helpers.loadFixture(deploy);
        await helpers.mineUpTo(2n**80n);
        await expect(api3PartialAggregatorV2V3Interface.latestRoundData())
          .to.be.revertedWithCustomError(api3PartialAggregatorV2V3Interface, 'BlockNumberIsNotCastableToUint80')
          .withArgs();
      });
    });
    */
  });
});
