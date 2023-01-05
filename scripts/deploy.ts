import { ethers, network, run } from 'hardhat'

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

  if (network.name === 'goerli') {
    const WAIT_BLOCK_CONFIRMATIONS = 6
    await nectarVault.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS)

    console.log(`Contract deployed to ${nectarVault.address} on ${network.name}`)

    console.log(`Verifying contract on Etherscan...`)

    await run(`verify:verify`, {
      address: nectarVault.address,
      constructorArguments: [],
    })
  }
}

// We recommend this pattern to be able to use async/await everywhere and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
