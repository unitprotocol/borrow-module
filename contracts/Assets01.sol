// SPDX-License-Identifier: bsl-1.1
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";


library Assets01 {
    using SafeERC20 for IERC20;

    enum AssetType { ERC20, ERC721 }

    function getAssetFrom(AssetType _assetType, address _assetAddr, uint _idOrAmount, address _from, address _to) internal {
        if (_assetType == AssetType.ERC20 ) {
            IERC20(_assetAddr).safeTransferFrom(_from, _to, _idOrAmount);
        } else if (_assetType == AssetType.ERC721 ) {
            IERC721(_assetAddr).safeTransferFrom(_from, _to, _idOrAmount);
        } else {
            revert("UNSUPPORTED_ASSET_TYPE");
        }
    }

    function sendAssetTo(AssetType _assetType, address _assetAddr, uint _idOrAmount, address _to) internal {
        if (_assetType == AssetType.ERC20 ) {
            IERC20(_assetAddr).safeTransfer(_to, _idOrAmount);
        } else if (_assetType == AssetType.ERC721 ) {
            IERC721(_assetAddr).safeTransferFrom(address(this), _to, _idOrAmount);
        } else {
            revert("UNSUPPORTED_ASSET_TYPE");
        }
    }
}
