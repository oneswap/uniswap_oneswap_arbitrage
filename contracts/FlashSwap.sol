pragma solidity 0.6.12;

import './libraries/UniswapV2Library.sol';
import './interfaces/IUniswapV2Pair.sol';
import './interfaces/IOneswapPair.sol';
import './interfaces/IERC20.sol';
import './interfaces/IUniswapV2Factory.sol';
import './interfaces/IOneSwapFactory.sol';

contract FlashSwap {
    address public immutable uniswapFactory;
    address public immutable oneswapFactory;

    event AmountReturn(uint256);
    constructor(address _factory,  address _oneswapFactory) public {
        uniswapFactory = _factory;
        oneswapFactory = _oneswapFactory;
    }

    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external {

        address token0 = IUniswapV2Pair(msg.sender).token0();
        address token1 = IUniswapV2Pair(msg.sender).token1();
        address uniswapPair = IUniswapV2Factory(uniswapFactory).getPair(token0,token1);
        {
            assert(msg.sender == uniswapPair);
            require(amount0 == 0 || amount1 == 0,'one of token amount should be zero'); // this strategy is unidirectional
        }
        address pairAddress;
        {
            (bool token0IsStock, bool isOnlySwap) = abi.decode(data,(bool,bool));
            address stock = token0IsStock ? token0: token1;
            address money = token0IsStock ? token1: token0;
            pairAddress = IOneSwapFactory(oneswapFactory).tokensToPair(stock,money,isOnlySwap);
            require(pairAddress != address(0), 'OneSwap Pair does not exist!');
        }

        IOneSwapPair pair = IOneSwapPair(pairAddress);
        (uint reserve0,uint reserve1,) = IUniswapV2Pair(uniswapPair).getReserves();

        if (amount0 > 0) {
            IERC20(token0).transfer(pairAddress,amount0);
            uint amountReceived = pair.addMarketOrder(token0,address(this),uint112(amount0));
            uint amountRequired = UniswapV2Library.getAmountIn(amount0, reserve1, reserve0);
            require(amountReceived > amountRequired,'No profit to earn');
            IERC20(token1).transfer(msg.sender,amountRequired);
            IERC20(token1).transfer(sender,amountReceived - amountRequired);
            emit AmountReturn(amountReceived - amountRequired);
        } else {
            IERC20(token1).transfer(pairAddress,amount1);
            uint amountReceived = pair.addMarketOrder(token1,address(this),uint112(amount1));
            uint amountRequired = UniswapV2Library.getAmountIn(amount1, reserve0, reserve1);
            require(amountReceived > amountRequired,'No profit to earn');
            IERC20(token0).transfer(msg.sender,amountRequired);
            IERC20(token0).transfer(sender,amountReceived - amountRequired);
            emit AmountReturn(amountReceived - amountRequired);
        }
    }
}
