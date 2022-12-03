// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

abstract contract Vault {
  function withdraw() public virtual;
}

// Contract to test handling withdrawals to a receiving contract
contract Receiving {
  function callWithdraw(address vaultAddress) external {
    Vault vault = Vault(vaultAddress);
    vault.withdraw();
  }

  receive() external payable {}
}
