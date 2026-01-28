// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AstroToken
 * @dev Simple governance token for AstroDAO
 */
contract AstroToken is ERC20, Ownable {
    
    constructor() ERC20("AstroToken", "ASTRO") Ownable(msg.sender) {
        // Mint initial supply to deployer (100 million tokens)
        _mint(msg.sender, 100_000_000 * 10**18);
    }
    
    /**
     * @dev Mint additional tokens (only owner)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
