pragma solidity 0.6.12;

import './libraries/UniswapV2Library.sol';
import './interfaces/IUniswapV2Pair.sol';
import './interfaces/IOneswapPair.sol';
import './interfaces/IERC20.sol';
import './interfaces/IUniswapV2Factory.sol';

contract FlashSwap {
    address public immutable uniswapFactory;
    address public immutable oneswapPair;

    event AmountReturn(uint256);
    constructor(address _factory, address _pair) public {
        uniswapFactory = _factory;
        oneswapPair = _pair;
    }

    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external {

        address token0 = IUniswapV2Pair(msg.sender).token0();
        address token1 = IUniswapV2Pair(msg.sender).token1();
        address uniswapPair = IUniswapV2Factory(uniswapFactory).getPair(token0,token1);
        {
            assert(msg.sender == uniswapPair);
            require(amount0 == 0 || amount1 == 0,'one of token amount should be zero'); // this strategy is unidirectional
        }

        IOneSwapPair pair = IOneSwapPair(oneswapPair);
        (uint112 reserve0,uint112 reserve1,) = IUniswapV2Pair(uniswapPair).getReserves();

        if (amount0 > 0) {
            // pay back add tokens to pair
            IERC20(token0).transfer(address(pair),amount0);
            uint amountReceived = pair.addMarketOrder(token0,address(this),uint112(amount0));
            uint amountRequired = UniswapV2Library.getAmountIn(amount0, uint(reserve1), uint(reserve0));
            IERC20(token1).transfer(address(msg.sender),amountRequired);
            IERC20(token1).transfer(sender,amountReceived-amountRequired);
            emit AmountReturn(amountReceived-amountRequired);
        } else {
            IERC20(token1).transfer(address(pair),amount1);
            uint amountReceived = pair.addMarketOrder(token1,address(this),uint112(amount1));
            uint amountRequired = UniswapV2Library.getAmountIn(amount1, uint(reserve0), uint(reserve1));
            IERC20(token0).transfer(address(msg.sender),amountRequired);
            IERC20(token0).transfer(sender,amountReceived-amountRequired);
            emit AmountReturn(amountReceived-amountRequired);
        }
    }
}
