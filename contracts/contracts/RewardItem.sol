// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Import necessary OpenZeppelin contracts
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol"; // The core ERC1155 standard
import "@openzeppelin/contracts/access/Ownable.sol"; // To control who can create/mint items
import "@openzeppelin/contracts/utils/Strings.sol"; // Utility for converting numbers to strings (used internally for URI)

/**
 * @title RewardItem
 * @dev An ERC1155 contract to manage various collectible NFT items earned in Habitarium.
 * The contract Owner can define new item types and mint items to users.
 */
contract RewardItem is ERC1155, Ownable {
    // Counter to assign unique IDs to new item types we create
    uint256 public nextTokenId = 0; // Starts at 0, first item will be ID 0, then 1, etc.

    // Mapping from each token ID (item type) to its metadata URI
    // The URI points to a JSON file describing the item (name, description, image)
    mapping(uint256 => string) public uriMapping;

    // Optional: Mapping to store a simple description on-chain for easier reference
    mapping(uint256 => string) public itemDescription;

    // --- Events ---
    // Emitted when a new item type is created
    event ItemTypeCreated(uint256 indexed tokenId, string description, string uri);

    /**
     * @dev Constructor: Initializes the ERC1155 contract and sets the deployer as Owner.
     * The base ERC1155 constructor requires a default URI, but we'll set it per-token,
     * so we pass an empty string initially.
     */
    constructor()
        ERC1155("") // Base ERC1155 requires a URI, but we override it below
        Ownable(msg.sender) // Set deployer as owner
    {}

    /**
     * @dev Returns the metadata URI for a specific token ID (item type).
     * This is a standard ERC1155 function that we override to use our mapping.
     * Wallet interfaces and marketplaces use this to display item details.
     */
    function uri(uint256 _tokenId) public view override returns (string memory) {
        // Check if a URI has been set for this ID
        require(bytes(uriMapping[_tokenId]).length > 0, "RewardItem: URI not set for this token ID");
        return uriMapping[_tokenId];
    }

    /**
     * @dev Creates a new type of NFT item. Only callable by the Owner.
     * Assigns the next available token ID to this new item type.
     * @param _uri The URI pointing to the JSON metadata for this item type.
     * @param _description A simple on-chain description for reference.
     * @return newItemId The unique ID assigned to the newly created item type.
     */
    function createItemType(string memory _uri, string memory _description)
        public
        onlyOwner // Only the contract owner can create new types of items
        returns (uint256)
    {
        uint256 newItemId = nextTokenId++; // Get current ID, then increment counter for the next one
        require(bytes(_uri).length > 0, "RewardItem: URI cannot be empty");

        uriMapping[newItemId] = _uri; // Store the metadata URI for this ID
        itemDescription[newItemId] = _description; // Store the description

        // Emit an event to log the creation (useful for off-chain services)
        emit ItemTypeCreated(newItemId, _description, _uri);

        // Emit the standard ERC1155 URI event (expected by some interfaces)
        // Note: In older OZ versions, this emit might not be needed if overriding uri()
        emit URI(_uri, newItemId);

        return newItemId; // Return the ID of the new item type
    }

    /**
     * @dev Mints copies of an existing item type (specified by ID) to a user. Only callable by the Owner.
     * @param account The address receiving the NFTs.
     * @param id The token ID of the item type to mint.
     * @param amount The number of copies to mint.
     * @param data Additional data (often unused, pass '0x').
     */
    function mint(address account, uint256 id, uint256 amount, bytes memory data)
        public
        onlyOwner // Only the owner (our backend service) can mint items
    {
        // Check if the item type exists (i.e., if its ID is less than the nextTokenId)
        require(id < nextTokenId, "RewardItem: Item type with this ID does not exist");
        _mint(account, id, amount, data); // Internal ERC1155 function to perform the minting
    }

    /**
     * @dev Mints multiple different item types to a user in a single transaction. Only callable by the Owner.
     * More gas-efficient than calling mint() multiple times.
     * @param to The address receiving the NFTs.
     * @param ids Array of token IDs of the item types to mint.
     * @param amounts Array of the number of copies for each corresponding item type ID.
     * @param data Additional data (often unused, pass '0x').
     */
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        public
        onlyOwner // Only the owner can batch mint
    {
        require(ids.length == amounts.length, "RewardItem: ids and amounts arrays must have the same length");
        // Optional: Could add a check here to ensure all 'ids' are less than 'nextTokenId'
        _mintBatch(to, ids, amounts, data); // Internal ERC1155 function for batch minting
    }


}