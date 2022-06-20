// SPDX-License-Identifier: bsl-1.1
pragma solidity ^0.8.0;

import "../BorrowModule01.sol";
import "hardhat/console.sol";

contract BorrowModule01Mock is BorrowModule01 {

    constructor(address _parametersStorage) BorrowModule01(_parametersStorage) {}

    function _calcFeeAmount_tests(address _asset, uint _amount) external view returns (uint _feeAmount, uint _amountWithoutFee) {
        return super._calcFeeAmount(_asset, _amount);
    }

    function _calcTotalDebt_tests(uint debtAmount, uint interestRate, uint durationDays) external pure returns (uint) {
        return super._calcTotalDebt(debtAmount, interestRate, durationDays);
    }

    function _calcCurrentInterestRate_tests(uint auctionStartTS, uint16 interestRateMin, uint16 interestRateMax) external view returns (uint16) {
        return super._calcCurrentInterestRate(auctionStartTS, interestRateMin, interestRateMax);
    }
}
