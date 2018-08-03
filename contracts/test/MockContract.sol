pragma solidity ^0.4.23;


contract MockContract {
  bool public isNonPayableExecuted;
  bool public isPayableExecuted;

  function nonPayableExecute() public {
    isNonPayableExecuted = true;
  }

  function payableExecute() public payable {
    isPayableExecuted = true;
  }
}
