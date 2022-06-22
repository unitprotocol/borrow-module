// SPDX-License-Identifier: bsl-1.1
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";


library Assets01 {
    using SafeERC20 for IERC20;
    using ERC165Checker for address;

    function getFrom(address _assetAddr, address _from, address _to, uint _idOrAmount) internal {
        if (_assetAddr.supportsInterface(type(IERC721).interfaceId)) {
            IERC721(_assetAddr).safeTransferFrom(_from, _to, _idOrAmount);
        } else {
            IERC20(_assetAddr).safeTransferFrom(_from, _to, _idOrAmount);
        }
    }

    function sendTo(address _assetAddr, address _to, uint _idOrAmount) internal {
        if (_assetAddr.supportsInterface(type(IERC721).interfaceId)) {
            IERC721(_assetAddr).safeTransferFrom(address(this), _to, _idOrAmount);
        } else {
            IERC20(_assetAddr).safeTransfer(_to, _idOrAmount);
        }
    }
}
