pragma solidity 0.6.12;

import './libraries/UniswapV2Library.sol';
import './interfaces/IUniswapV2Pair.sol';
import './interfaces/IOneswapPair.sol';
import './interfaces/IERC20.sol';
import './interfaces/IUniswapV2Factory.sol';
import './interfaces/IOneSwapFactory.sol';
import './interfaces/IWETH.sol';

struct PairInfo{
    address token0;
    address token1;
    address token0ForOneswap;
    address token1ForOneswap;
    bool token0IsStock;
    bool isOnlySwap;

}
contract FlashSwap {
    address public immutable uniswapFactory;
    address public immutable oneswapFactory;
    address public immutable weth;

    event AmountReturn(address,address,uint256);
    constructor(address _factory,  address _oneswapFactory, address _weth) public {
        uniswapFactory = _factory;
        oneswapFactory = _oneswapFactory;
        weth = _weth;
    }

    receive() external payable { }
    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external{

        PairInfo memory pairInfo;
        pairInfo.token0 = IUniswapV2Pair(msg.sender).token0();
        pairInfo.token1 = IUniswapV2Pair(msg.sender).token1();
        pairInfo.token0ForOneswap = (pairInfo.token0 == weth) ? address(0) : pairInfo.token0;
        pairInfo.token1ForOneswap = (pairInfo.token1 == weth) ? address(0) : pairInfo.token1;

        address uniswapPair = IUniswapV2Factory(uniswapFactory).getPair(pairInfo.token0,pairInfo.token1);
        {
            assert(msg.sender == uniswapPair);
            require(amount0 == 0 || amount1 == 0,'Either amount0 or amount1 should be zero'); // this strategy is unidirectional
        }

        address pairAddress;
        {
            (pairInfo.token0IsStock, pairInfo.isOnlySwap) = abi.decode(data,(bool,bool));
            address stock = pairInfo.token0IsStock ? pairInfo.token0ForOneswap: pairInfo.token1ForOneswap;
            address money = pairInfo.token0IsStock ? pairInfo.token1ForOneswap: pairInfo.token0ForOneswap;
            pairAddress = IOneSwapFactory(oneswapFactory).tokensToPair(stock,money,pairInfo.isOnlySwap);
            require(pairAddress != address(0), 'OneSwap Pair does not exist!');
        }

        IOneSwapPair pair = IOneSwapPair(pairAddress);
        (uint reserve0,uint reserve1,) = IUniswapV2Pair(uniswapPair).getReserves();

        if (amount0 > 0) {
                _safeTransferWETHToETH(pairInfo.token0, pairAddress, amount0);
                uint amountReceived = pair.addMarketOrder(pairInfo.token0ForOneswap,address(this),uint112(amount0));
                uint amountRequired = UniswapV2Library.getAmountIn(amount0, reserve1, reserve0);
                require(amountReceived > amountRequired,'No profit to earn');
                _safeTransferETHToWETH(pairInfo.token1,msg.sender,amountRequired);
                _safeTransfer(pairInfo.token1, sender,amountReceived - amountRequired);
                emit AmountReturn(pairInfo.token1, sender, amountReceived - amountRequired);
        } else {
                _safeTransferWETHToETH(pairInfo.token1, pairAddress, amount1);
                uint amountReceived = pair.addMarketOrder(pairInfo.token1ForOneswap,address(this),uint112(amount1));
                uint amountRequired = UniswapV2Library.getAmountIn(amount1, reserve0, reserve1);
                require(amountReceived > amountRequired,'No profit to earn');
                _safeTransferETHToWETH(pairInfo.token0,msg.sender,amountRequired);
                _safeTransfer(pairInfo.token0, sender, amountReceived - amountRequired);
                emit AmountReturn(pairInfo.token0, sender, amountReceived - amountRequired);

        }
    }
    function _safeTransferWETHToETH(address token, address to, uint amount) internal {
        if (token == weth){
            IWETH(weth).withdraw(amount);
            _safeTransferETH(to,amount);
        }else{
            require(IERC20(token).transfer(to,amount),'ERC20 transfer failed');
        }
    }
    function _safeTransferETHToWETH(address token, address to, uint amount) internal {
        if (token == weth){
            IWETH(weth).deposit{value:amount}();
            require(IWETH(weth).transfer(to, amount),'WETH transfer failed');
        }else{
            require(IERC20(token).transfer(to,amount),'ERC20 transfer failed');
        }
    }
    function _safeTransfer(address token, address to, uint amount) internal {
        if (token == weth){
            _safeTransferETH(to, amount);
        }else{
            require(IERC20(token).transfer(to,amount),'ERC20 transfer failed');
        }
    }
    function _safeTransferETH(address to, uint value) internal {
        (bool success,) = to.call{value:value}(new bytes(0));
        require(success, 'ETH transfer failed');
    }

}
