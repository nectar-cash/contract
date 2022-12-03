import { ethers } from 'hardhat'

async function main() {
  const NectarVault = await ethers.getContractFactory('NectarVault')
  const nectarVault = await NectarVault.deploy()

  // const NonReceiving = await ethers.getContractFactory('NonReceiving')
  // const nonReceiving = await NonReceiving.deploy()

  // const Receiving = await ethers.getContractFactory('Receiving')
  // const receiving = await Receiving.deploy()

  await nectarVault.deployed()
  // await nonReceiving.deployed()
  // await receiving.deployed()
}

// We recommend this pattern to be able to use async/await everywhere and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
