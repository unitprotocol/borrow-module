// SPDX-License-Identifier: bsl-1.1
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Token is ERC20 {
    constructor(uint amountToMint) ERC20('Token name', 'symbol')
    {
        _mint(msg.sender, amountToMint > 0 ? amountToMint : 100 ether);
    }
}
