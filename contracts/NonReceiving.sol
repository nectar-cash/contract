// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

abstract contract Vault {
  function withdraw() public virtual;
}

// Contract to test handling withdrawals to a non-receiving contract
contract NonReceiving {
  function callWithdraw(address vaultAddress) external {
    Vault vault = Vault(vaultAddress);
    vault.withdraw();
  }
}
