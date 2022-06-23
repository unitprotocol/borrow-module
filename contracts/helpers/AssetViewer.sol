// SPDX-License-Identifier: bsl-1.1
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Address.sol";


contract AssetViewer {
    using ERC165Checker for address;

    enum AssetType {Unknown, ERC20, ERC721}

    struct Asset {
        address addr;
        AssetType assetType;
        uint userBalance;
    }

    function checkAssets(address _user, address[] memory _assets) public view returns (Asset[] memory _result) {
        _result = new Asset[](_assets.length);
        for (uint i=0; i<_assets.length; i++) {
            AssetType assetType;
            uint userBalance;

            if (Address.isContract(_assets[i])) {
                if (_assets[i].supportsInterface(type(IERC721).interfaceId)) {
                    assetType = AssetType.ERC721;
                } else {
                    assetType = AssetType.ERC20;
                }

                try IERC20(_assets[i]).balanceOf{gas: 30000}(_user) // as in IERC721
                    returns (uint balance)
                {
                    userBalance = balance;
                } catch (bytes memory) {
                    assetType = AssetType.Unknown;
                }
            }

            _result[i] = Asset(_assets[i], assetType, userBalance);
        }
    }
}
