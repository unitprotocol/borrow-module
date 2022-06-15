// SPDX-License-Identifier: bsl-1.1
pragma solidity ^0.8.0;

import "./interfaces/IParametersStorage.sol";


contract Auth {

    // address of the the contract with parameters
    IParametersStorage public immutable parameters;

    constructor(address _parameters) {
        require(_parameters != address(0), "ZERO_ADDRESS");

        parameters = IParametersStorage(_parameters);
    }

    // ensures tx's sender is a manager
    modifier onlyManager() {
        require(parameters.isManager(msg.sender), "AUTH_FAILED");
        _;
    }
}