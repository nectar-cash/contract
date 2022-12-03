// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import '@openzeppelin/contracts/utils/Context.sol';

contract NectarVault is Context {
  mapping(address => uint256) private _balances;
  mapping(address => uint256) private _deposits;

  event Withdrawal(address recipient, uint256 amount);

  constructor() {}

  function balanceOf(address recipient) external view returns (uint256) {
    return _balances[recipient];
  }

  function totalDepositsFor(address recipient) external view returns (uint256) {
    return _deposits[recipient];
  }

  function deposit(address[] memory recipients_, uint256[] memory amounts_) public payable {
    require(recipients_.length > 0, 'Recipients array is empty');
    require(recipients_.length == amounts_.length, 'Recipients and amounts arrays are not of equal length');

    uint256 depositTotal = 0;

    for (uint256 i = 0; i < recipients_.length; i++) {
      _balances[recipients_[i]] = _balances[recipients_[i]] + amounts_[i];
      _deposits[recipients_[i]] = _deposits[recipients_[i]] + amounts_[i];
      depositTotal += amounts_[i];
    }

    require(msg.value == depositTotal, 'Value not equal to total deposits');
  }

  function withdraw() public {
    address recipient = _msgSender();
    require(_balances[recipient] > 0, 'No funds to withdraw');

    uint256 withdrawal = _balances[recipient];
    _balances[recipient] = 0;

    (bool success, ) = recipient.call{value: withdrawal}('');
    require(success, 'Address: unable to send value, recipient may have reverted');

    emit Withdrawal(recipient, withdrawal);
  }
}
