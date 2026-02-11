# AES Text Encryption Debug - Changes Summary

## Files Modified

### 1. `/src/utils/computeGraph.js`

**Added Debug Logging** (for troubleshooting AES not working):

- **Line ~275**: Added `console.log` for text input conversion to binary
  ```javascript
  console.log("✍️ TEXT INPUT PLAINTEXT:", {
    inputText: n.data.value?.slice(0, 20),
    binaryOutput: normVal?.slice(0, 32) + "...",
    binaryLength: normVal?.length,
  });
  ```

- **Lines 685-695**: Added XOR case marker
  ```javascript
  console.log("========================================");
  console.log("🚀 XOR CASE REACHED!");
  console.log("========================================");
  ```

- **Lines 777-780**: Added AES case marker
  ```javascript
  console.log("========================================");
  console.log("🚀 AES CASE REACHED!");
  console.log("========================================");
  ```

- **Lines 785-795**: Enhanced AES encryption logging
  ```javascript
  console.log("  🔐 AES ENCRYPTION STARTING");
  console.log("    pVal:", pVal ? pVal.slice(0, 32) + "..." : "NULL");
  console.log("    pVal length:", pVal?.length || 0);
  console.log("    kVal:", kVal ? kVal.slice(0, 32) + "..." : "NULL");
  console.log("    kVal length:", kVal?.length || 0);
  console.log("    🔍 Encryption result:", encrypted ? encrypted.slice(0, 32) + "..." : "NULL");
  ```

- **Lines 822-823**: Added outgoing edges logging
  ```javascript
  console.log("    📤 Outgoing edges found:", outgoingEdges.length);
  console.log("    Updating Ciphertext node:", e.target, "tIdx:", tIdx);
  ```

- **Lines 847+**: Added DES case marker (similar to XOR/AES)

- **Lines 418-433**: Enhanced BlockCipher node logging
  ```javascript
  console.log("   Mode:", mode, "Cipher type:", n.data?.cipherType);
  console.log("  💾 pVal from valueMap:", pVal ? pVal.slice(0,32) + "..." : "NULL");
  console.log("  💾 pType:", pType);
  ```

## Testing Instructions

### Step 1: Setup
- Open app in browser
- Switch to **ECB** mode
- Click "Text" radio button in PlaintextNode
- Type a word (e.g., "Hi")

### Step 2: Configure Cipher
- Go to BlockCipherNode
- Select "AES" from cipher dropdown
- Click "🎲 128" random button for AES key

### Step 3: Watch Console
- Open browser Dev Tools (F12)
- Check Console tab
- Look for the debug markers in order:
  1. "✍️ TEXT INPUT PLAINTEXT:" - confirms plaintext is converting
  2. "🚀 AES CASE REACHED!" - confirms AES branch is executing
  3. "🔐 AES ENCRYPTION STARTING" - confirms encryption is running
  4. "🔍 Encryption result:" - shows if encryption succeeded
  5. "📤 Outgoing edges found:" - shows if result can be sent to Ciphertext

### Step 4: Identify Issue
- **If "✍️ TEXT INPUT PLAINTEXT:" is missing** → PlaintextNode not updating its value
- **If "🚀 AES CASE REACHED!" is missing** → BlockCipherNode's cipherType not being read by computeGraph
- **If "🔐 AES ENCRYPTION STARTING" is missing** → pVal or kVal is null
- **If "🔍 Encryption result: NULL" appears** → AES encryption function returning null
- **If "📤 Outgoing edges found: 0" appears** → No edge between BlockCipher and Ciphertext
- **If result still shows "Waiting for result"** → React state not updating despite edge being found

## Expected Console Output (Success Case)

```
✍️ TEXT INPUT PLAINTEXT: {
  inputText: "Hi",
  binaryOutput: "01001000 01101001",
  binaryLength: 16
}
========================================
🚀 AES CASE REACHED!
========================================
   Mode: ecb Cipher type: aes
  📥 Incoming edges: {plaintext: true, key: true, prevCipher: false}
  💾 pVal from valueMap: 0100100001101001...
  💾 pType: text
🔐 AES ENCRYPTION STARTING
    pVal: 0100100001101001...
    pVal length: 16
    kVal: a1b2c3d4e5f6g7h8...
    kVal length: 32
    🔍 Encryption result: A1B2C3D4E5F6G7H8...
    📤 Outgoing edges found: 1
    Updating Ciphertext node: c1 tIdx: 3
```

## Architecture Reference

**Data Flow for AES Text Encryption**:
1. PlaintextNode (text input) → converts to binary via `textToBinary()` → stores in valueMap
2. KeyNode (AES key) → stores `keyText` (passphrase) in valueMap  
3. BlockCipherNode receives both via incoming edges
4. computeGraph's BlockCipher handler:
   - Retrieves `pVal` (binary) from plaintext valueMap
   - Retrieves `kVal` (keyText) from key valueMap
   - Calls `encryptBitsWithAES(pVal, kVal)` which:
     - Converts binary → text via `binaryToText()`
     - Encrypts text with AES-ECB using CryptoJS
     - Returns encrypted HEX string
   - Updates BlockCipherNode.data with result
   - Finds outgoing edge to CiphertextNode
   - Updates CiphertextNode.data.result
5. CiphertextNode displays the encrypted HEX in textarea

## Key Functions Used

- `textToBinary(text)` - Converts text chars to 8-bit binary string
- `binaryToText(binStr)` - Converts 8-bit chunks to ASCII chars
- `encryptBitsWithAES(bits, keyPassphrase)` - Main AES encryption function
  - Uses CryptoJS.AES.encrypt() with ECB mode
  - Returns HEX string or null
- `computeGraphValues(nodes, edges, mode)` - Main computation engine
  - Walks all nodes, fills valueMap
  - Executes cipher operations
  - Propagates results to output nodes

