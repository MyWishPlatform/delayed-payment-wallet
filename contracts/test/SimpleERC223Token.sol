pragma solidity ^0.4.23;

import "sc-library/contracts/ERC223/ERC223Token.sol";


contract SimpleERC223Token is ERC223Token {
  constructor() public {
    balances[msg.sender] = 1000;
  }
}
