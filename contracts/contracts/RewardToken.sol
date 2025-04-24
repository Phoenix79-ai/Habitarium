// SPDX-License-Identifier: MIT
// Specifies the license (use MIT for OpenZeppelin compatibility)
pragma solidity ^0.8.19; // Specifies the Solidity compiler version we want to use (must match hardhat.config.ts)

// Import necessary contracts from the OpenZeppelin library
// We installed these earlier with 'npm install @openzeppelin/contracts'
import "@openzeppelin/contracts/token/ERC20/ERC20.sol"; // The standard ERC20 token implementation
import "@openzeppelin/contracts/access/Ownable.sol"; // Provides ownership control (restricts who can mint)

/**
 * @title RewardToken
 * @dev A simple ERC20 token for rewarding users in Habitarium.
 * Inherits from OpenZeppelin's ERC20 and Ownable contracts.
 * The contract deployer (Owner) will have the authority to mint new tokens.
 */
contract RewardToken is ERC20, Ownable {

    /**
     * @dev Constructor sets the initial details of the token.
     * It also sets the deployer of the contract as the initial Owner.
     */
    constructor()
        ERC20("Habitarium Token", "HABIT") // Sets the token's full name and symbol
        Ownable(msg.sender) // Sets the address that deploys this contract as the owner
    {
        // msg.sender is the address calling the constructor (the deployer)
        // The Owner can later transfer ownership if needed.
    }

    /**
     * @dev Allows the Owner (only) to create new tokens and assign them to an account.
     * This function will typically be called by our backend service later.
     * @param to The address that will receive the newly minted tokens.
     * @param amount The quantity of tokens to mint.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        // 'onlyOwner' is a modifier from Ownable.sol. It ensures only the owner address
        // (initially the deployer, likely our backend wallet later) can call this function.
        // If called by anyone else, the transaction will fail (revert).

        _mint(to, amount); // Internal ERC20 function that actually increases the recipient's balance and total supply.
    }

    
}