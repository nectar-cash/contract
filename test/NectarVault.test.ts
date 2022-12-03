// import 'tsconfig-paths/register';
import '@typechain/hardhat'
import '@nomicfoundation/hardhat-toolbox'

// import 'hardhat-watcher';
// import '@tenderly/hardhat-tenderly';
// import '@primitivefi/hardhat-dodoc';
// import 'hardhat-tracer';
// import 'hardhat-contract-sizer';
// import '@nomiclabs/hardhat-solhint';
// import 'hardhat-deploy';
// import 'hardhat-deploy-ethers';
// import { smock } from '@defi-wonderland/smock';
// use(smock.matchers);
// import { should } from 'chai';
// should(); // if you like should syntax
// import '@nomicfoundation/hardhat-chai-matchers';
// import sinonChai from 'sinon-chai';
// use(sinonChai);

import { takeSnapshot, mine, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { BigNumber } from 'ethers'
import {
  NectarVault__factory,
  NectarVault,
  NonReceiving__factory,
  NonReceiving,
  Receiving__factory,
  Receiving,
} from '../typechain-types'
import { ethers } from 'hardhat'

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const revertReasons = {
  noRecipients: 'Recipients array is empty',
  arraysUneven: 'Recipients and amounts arrays are not of equal length',
  valueMismatch: 'Value not equal to total deposits',
  noFunds: 'No funds to withdraw',
  valueSendReverted: 'Address: unable to send value, recipient may have reverted',
}

describe('Nectar Vault', function () {
  let snap: SnapshotRestorer

  let deployer: SignerWithAddress
  let user: SignerWithAddress
  let user2: SignerWithAddress

  let vaultDeployer: NectarVault // with deployer
  let vaultUser: NectarVault

  let nonReceiving: NonReceiving
  let receiving: Receiving

  let defaultValue: BigNumber

  before(async () => {
    ;[deployer, user, user2] = await ethers.getSigners()

    const NectarVault = new NectarVault__factory(deployer)
    vaultDeployer = await NectarVault.deploy()

    const NonReceiving = new NonReceiving__factory(deployer)
    nonReceiving = await NonReceiving.deploy()

    const Receiving = new Receiving__factory(deployer)
    receiving = await Receiving.deploy()

    vaultUser = vaultDeployer.connect(user)

    defaultValue = ethers.utils.parseEther('1')
  })

  beforeEach(async () => {
    await vaultDeployer.deployed()
    await nonReceiving.deployed()
    await receiving.deployed()

    snap = await takeSnapshot()
    mine()
  })
  afterEach(async () => {
    await snap.restore()
  })

  describe('Depositing', function () {
    it('Should allow depositing for a single recipient', async function () {
      await expect(vaultDeployer.deposit([user.address], [defaultValue], { value: defaultValue })).to.not.be.reverted

      expect(await vaultDeployer.balanceOf(user.address)).to.be.equal(defaultValue)
      expect(await vaultDeployer.totalDepositsFor(user.address)).to.be.equal(defaultValue)
    })
    it('Should allow depositing for multiple recipients', async function () {
      await expect(
        vaultDeployer.deposit([user.address, user2.address], [defaultValue, defaultValue], {
          value: defaultValue.mul(2),
        })
      ).to.not.be.reverted

      expect(await vaultDeployer.balanceOf(user.address)).to.be.equal(defaultValue)
      expect(await vaultDeployer.totalDepositsFor(user.address)).to.be.equal(defaultValue)

      expect(await vaultDeployer.balanceOf(user2.address)).to.be.equal(defaultValue)
      expect(await vaultDeployer.totalDepositsFor(user2.address)).to.be.equal(defaultValue)
    })
    it('Should fail if no recipients are given', async function () {
      await expect(vaultDeployer.deposit([], [], { value: defaultValue })).to.be.revertedWith(
        revertReasons.noRecipients
      )
    })
    it('Should fail if number of deposited amounts does not match number of recipients', async function () {
      await expect(
        vaultDeployer.deposit([user.address, user2.address], [defaultValue], { value: defaultValue })
      ).to.be.revertedWith(revertReasons.arraysUneven)
    })
    it('Should fail if deposited total does not match sent value', async function () {
      await expect(
        vaultDeployer.deposit([user.address], [defaultValue], { value: defaultValue.mul(2) })
      ).to.be.revertedWith(revertReasons.valueMismatch)
    })
  })

  describe('Withdrawals', function () {
    it('Should allow withdrawal if funds are available', async function () {
      await expect(vaultDeployer.deposit([user.address], [defaultValue], { value: defaultValue })).to.not.be.reverted

      const availableAfterDeposit = await vaultDeployer.balanceOf(user.address)
      expect(availableAfterDeposit).to.be.equal(defaultValue)
      expect(await vaultDeployer.totalDepositsFor(user.address)).to.be.equal(defaultValue)

      const userInitialFunds = await user.getBalance()
      const withdrawalTx = await vaultUser.withdraw()
      const withdrawalReceipt = await withdrawalTx.wait()
      const gasSpent = withdrawalReceipt.gasUsed.mul(withdrawalReceipt.effectiveGasPrice)
      await expect(withdrawalTx).to.not.be.reverted

      const availableAfterWithdrawal = await vaultDeployer.balanceOf(user.address)
      expect(availableAfterWithdrawal).to.be.equal(ethers.utils.parseEther('0'))
      expect(await vaultDeployer.totalDepositsFor(user.address)).to.be.equal(defaultValue)

      const userFundsAfterWithdrawal = await user.getBalance()
      expect(userFundsAfterWithdrawal).to.be.equal(userInitialFunds.add(availableAfterDeposit).sub(gasSpent))
    })
    it('Should not allow repeated withdrawal', async function () {
      await expect(vaultDeployer.deposit([user.address], [defaultValue], { value: defaultValue })).to.not.be.reverted

      await expect(vaultUser.withdraw()).to.not.be.reverted
      await expect(vaultUser.withdraw()).to.be.revertedWith(revertReasons.noFunds)
    })
    it('Should fail if no funds are available', async function () {
      await expect(vaultUser.withdraw()).to.be.revertedWith(revertReasons.noFunds)
    })
    it('Should allow withdrawals for smart contract able to receive', async function () {
      await expect(vaultDeployer.deposit([receiving.address], [defaultValue], { value: defaultValue })).to.not.be
        .reverted
      await expect(receiving.callWithdraw(vaultDeployer.address)).to.not.be.reverted
    })
    it('Should fail if address reverts sending value', async function () {
      await expect(vaultDeployer.deposit([nonReceiving.address], [defaultValue], { value: defaultValue })).to.not.be
        .reverted
      await expect(nonReceiving.callWithdraw(vaultDeployer.address)).to.be.revertedWith(revertReasons.valueSendReverted)
    })
  })

  describe('Reporting', function () {
    it('Should report address total deposits', async function () {
      await expect(vaultDeployer.deposit([user.address], [defaultValue], { value: defaultValue })).to.not.be.reverted
      expect(await vaultDeployer.totalDepositsFor(user.address)).to.be.equal(defaultValue)

      await expect(vaultUser.withdraw()).to.not.be.reverted

      await expect(vaultDeployer.deposit([user.address], [defaultValue], { value: defaultValue })).to.not.be.reverted
      expect(await vaultDeployer.totalDepositsFor(user.address)).to.be.equal(defaultValue.mul(2))
    })
    it('Should allow deriving previously withdrawn amount', async function () {
      await expect(vaultDeployer.deposit([user.address], [defaultValue], { value: defaultValue })).to.not.be.reverted
      expect(await vaultDeployer.totalDepositsFor(user.address)).to.be.equal(defaultValue)

      await expect(vaultUser.withdraw()).to.not.be.reverted

      await expect(vaultDeployer.deposit([user.address], [defaultValue], { value: defaultValue })).to.not.be.reverted

      const totalDeposits = await vaultUser.totalDepositsFor(user.address)
      const availableBalance = await vaultUser.balanceOf(user.address)

      expect(totalDeposits.sub(availableBalance)).to.be.equal(defaultValue)
    })
  })
})
