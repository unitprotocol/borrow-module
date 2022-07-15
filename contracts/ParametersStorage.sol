// SPDX-License-Identifier: bsl-1.1
pragma solidity ^0.8.0;
pragma abicoder v2;

import "./Auth.sol";
import "./interfaces/IParametersStorage.sol";


contract ParametersStorage is IParametersStorage, Auth {

    uint public constant BASIS_POINTS_IN_1_PERCENT = 100;
    uint public constant MAX_FEE_BASIS_POINTS = 10 * BASIS_POINTS_IN_1_PERCENT;

    mapping(address => bool) public isManager;

    address public treasury;
    uint public baseFeeBasisPoints = 100;
    mapping(address => CustomFee) public assetCustomFee;

    /// @dev custom params, parameter => value, see Parameters*.sol. Does not affect assetCustomParams
    mapping(uint => bytes32) public customParams;
    mapping(address => mapping(uint => bytes32)) public assetCustomParams;

    modifier correctFee(uint16 fee) {
        require(fee <= MAX_FEE_BASIS_POINTS, "UP borrow module: INCORRECT_FEE_VALUE");
        _;
    }

    constructor(address _treasury) Auth(address(this)) {
        require(_treasury != address(0), "UP borrow module: ZERO_ADDRESS");

        isManager[msg.sender] = true;
        emit ManagerAdded(msg.sender);

        treasury = _treasury;
        emit TreasuryChanged(_treasury);
    }

    function getAssetFee(address _asset) public view returns (uint _feeBasisPoints) {
        if (assetCustomFee[_asset].enabled) {
            return assetCustomFee[_asset].feeBasisPoints;
        }

        return baseFeeBasisPoints;
    }

    /**
     * @notice Only manager is able to call this function
     * @dev Grants and revokes manager's status of any address
     * @param _who The target address
     * @param _permit The permission flag
     **/
    function setManager(address _who, bool _permit) external onlyManager {
        isManager[_who] = _permit;

        if (_permit) {
            emit ManagerAdded(_who);
        } else {
            emit ManagerRemoved(_who);
        }
    }

    /**
     * @notice Only manager is able to call this function
     * @dev Sets the treasury address
     * @param _treasury The new treasury address
     **/
    function setTreasury(address _treasury) external onlyManager {
        require(_treasury != address(0), "UP borrow module: ZERO_ADDRESS");
        treasury = _treasury;
        emit TreasuryChanged(_treasury);
    }

    function setBaseFee(uint16 _feeBasisPoints) external onlyManager correctFee(_feeBasisPoints) {
        baseFeeBasisPoints = _feeBasisPoints;
        emit BaseFeeChanged(_feeBasisPoints);
    }

    function setAssetCustomFee(address _asset, bool _enabled, uint16 _feeBasisPoints) external onlyManager correctFee(_feeBasisPoints) {
        assetCustomFee[_asset].enabled = _enabled;
        assetCustomFee[_asset].feeBasisPoints = _feeBasisPoints;

        if (_enabled) {
            emit AssetCustomFeeEnabled(_asset, _feeBasisPoints);
        } else {
            emit AssetCustomFeeDisabled(_asset);
        }
    }

    function setCustomParam(uint _param, bytes32 _value) public onlyManager {
        customParams[_param] = _value;
        emit CustomParamChanged(_param, _value);
    }

    /**
     * @dev convenient way to set parameters with UI of multisig
     */
    function setCustomParamAsUint(uint _param, uint _value) public onlyManager {
        setCustomParam(_param, bytes32(_value));
    }

    /**
     * @dev convenient way to set parameters with UI of multisig
     */
    function setCustomParamAsAddress(uint _param, address _value) public onlyManager {
        setCustomParam(_param, bytes32(uint(uint160(_value))));
    }

    function setAssetCustomParam(address _asset, uint _param, bytes32 _value) public onlyManager {
        assetCustomParams[_asset][_param] = _value;
        emit AssetCustomParamChanged(_asset, _param, _value);
    }

    /**
     * @dev convenient way to set parameters with UI of multisig
     */
    function setAssetCustomParamAsUint(address _asset, uint _param, uint _value) public onlyManager {
        setAssetCustomParam(_asset, _param, bytes32(_value));
    }

    /**
     * @dev convenient way to set parameters with UI of multisig
     */
    function setAssetCustomParamAsAddress(address _asset, uint _param, address _value) public onlyManager {
        setAssetCustomParam(_asset, _param, bytes32(uint(uint160(_value))));
    }
}
