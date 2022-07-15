// SPDX-License-Identifier: bsl-1.1
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../Assets01.sol";

contract AssetViewer {
    using ERC165Checker for address;

    struct Asset {
        address addr;
        Assets01.AssetType assetType;
        uint8 decimals;
        uint userBalance;
    }

    function checkAssets(address _user, address[] memory _assets) public view returns (Asset[] memory _result) {
        _result = new Asset[](_assets.length);
        for (uint i=0; i<_assets.length; i++) {
            Assets01.AssetType assetType;
            uint8 decimals;
            uint userBalance;

            if (Address.isContract(_assets[i])) {
                if (_assets[i].supportsInterface(type(IERC721).interfaceId)) {
                    assetType = Assets01.AssetType.ERC721;
                } else {
                    assetType = Assets01.AssetType.ERC20;
                }

                try IERC20Metadata(_assets[i]).balanceOf{gas: 30000}(_user) // as in IERC721
                    returns (uint balance)
                {
                    userBalance = balance;
                } catch (bytes memory) {
                    assetType = Assets01.AssetType.Unknown;
                }

                if (assetType == Assets01.AssetType.ERC20) {
                    try IERC20Metadata(_assets[i]).decimals{gas: 30000}()
                        returns (uint8 _decimals)
                    {
                        decimals = _decimals;
                    } catch (bytes memory) {
                        assetType = Assets01.AssetType.Unknown;
                    }
                }
            }

            _result[i] = Asset(_assets[i], assetType, decimals, userBalance);
        }
    }
}
