import hashlib
import base64
import secrets
import string
from typing import Callable, Dict
import hmac
import binascii
import random
import zlib
from Crypto.Cipher import DES, DES3, AES, ChaCha20, Salsa20, ARC4, Blowfish, Camellia
from Crypto.Util.Padding import pad
from Crypto.PublicKey import ECC, ElGamal
from Crypto.Cipher import AES as AES_Cipher
from Crypto.Random import get_random_bytes
from Crypto.Signature import eddsa
from Crypto.Hash import SHA256

class PasswordEncryptor:
    def __init__(self):
        # 定義加密方法字典，包含37種加密方式
        self.encryption_methods: Dict[str, Callable[[str], str]] = {
            'md5': self.md5_encrypt,
            'sha256': self.sha256_encrypt,
            'sha1': self.sha1_encrypt,
            'base64': self.base64_encrypt,
            'rot13': self.rot13_encrypt,
            'hmac_sha256': self.hmac_sha256_encrypt,
            'reverse': self.reverse_encrypt,
            'caesar': self.caesar_encrypt,
            'rail_fence': self.rail_fence_encrypt,
            'letter_substitution': self.letter_substitution_encrypt,
            'salted_sha256': self.salted_sha256_encrypt,
            'sha512': self.sha512_encrypt,
            'hex': self.hex_encrypt,
            'ascii_shift': self.ascii_shift_encrypt,
            'vigenere': self.vigenere_encrypt,
            'xor': self.xor_encrypt,
            'base32': self.base32_encrypt,
            'crc32': self.crc32_encrypt,
            'polybius_square': self.polybius_square_encrypt,
            'atbash': self.atbash_encrypt,
            'morse': self.morse_encrypt,
            'des': self.des_encrypt,
            'aes': self.aes_encrypt,
            'blowfish': self.blowfish_encrypt,
            'frequency_substitution': self.frequency_substitution_encrypt,
            'blake': self.blake_encrypt,
            'blake2': self.blake2_encrypt,
            'blake3': self.blake3_encrypt,
            'sha3': self.sha3_encrypt,
            'chacha20': self.chacha20_encrypt,
            'chacha12': self.chacha12_encrypt,
            'salsa20': self.salsa20_encrypt,
            'rc4': self.rc4_encrypt,
            'ecc': self.ecc_encrypt,
            'elgamal': self.elgamal_encrypt,
            '3des': self.triple_des_encrypt,
            'camellia': self.camellia_encrypt,
            'eddsa': self.eddsa_sign
        }
        self.available_methods = list(self.encryption_methods.keys())

    def md5_encrypt(self, text: str) -> str:
        return hashlib.md5(text.encode()).hexdigest()

    def sha256_encrypt(self, text: str) -> str:
        return hashlib.sha256(text.encode()).hexdigest()

    def sha1_encrypt(self, text: str) -> str:
        return hashlib.sha1(text.encode()).hexdigest()

    def sha512_encrypt(self, text: str) -> str:
        return hashlib.sha512(text.encode()).hexdigest()

    def sha3_encrypt(self, text: str) -> str:
        return hashlib.sha3_256(text.encode()).hexdigest()

    def base64_encrypt(self, text: str) -> str:
        return base64.b64encode(text.encode()).decode()

    def base32_encrypt(self, text: str) -> str:
        return base64.b32encode(text.encode()).decode()

    def rot13_encrypt(self, text: str) -> str:
        return text.translate(str.maketrans(
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
            'NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm'))

    def hmac_sha256_encrypt(self, text: str) -> str:
        key = secrets.token_hex(16)
        return hmac.new(key.encode(), text.encode(), hashlib.sha256).hexdigest()

    def reverse_encrypt(self, text: str) -> str:
        return text[::-1]

    def caesar_encrypt(self, text: str) -> str:
        shift = 3
        result = ''
        for char in text:
            if char.isalpha():
                ascii_offset = 65 if char.isupper() else 97
                result += chr((ord(char) - ascii_offset + shift) % 26 + ascii_offset)
            else:
                result += char
        return result

    def rail_fence_encrypt(self, text: str) -> str:
        rails = 3
        rail = [[' ' for _ in range(len(text))] for _ in range(rails)]
        row, col, down = 0, 0, False
        for char in text:
            rail[row][col] = char
            col += 1
            if row == 0 or row == rails - 1:
                down = not down
            row += 1 if down else -1
        return ''.join(char for row in rail for char in row if char != ' ')

    def letter_substitution_encrypt(self, text: str) -> str:
        alphabet = string.ascii_lowercase
        shuffled = ''.join(random.sample(alphabet, len(alphabet)))
        trans_table = str.maketrans(alphabet + alphabet.upper(), shuffled + shuffled.upper())
        return text.translate(trans_table)

    def salted_sha256_encrypt(self, text: str) -> str:
        salt = secrets.token_hex(8)
        return hashlib.sha256((text + salt).encode()).hexdigest()

    def hex_encrypt(self, text: str) -> str:
        return text.encode().hex()

    def ascii_shift_encrypt(self, text: str) -> str:
        shift = 5
        return ''.join(chr((ord(c) + shift) % 128) if ord(c) < 128 else c for c in text)

    def vigenere_encrypt(self, text: str) -> str:
        key = 'key'
        result = ''
        key = key.lower() * (len(text) // len(key) + 1)
        for i, char in enumerate(text):
            if char.isalpha():
                ascii_offset = 65 if char.isupper() else 97
                key_offset = ord(key[i].lower()) - 97
                result += chr((ord(char) - ascii_offset + key_offset) % 26 + ascii_offset)
            else:
                result += char
        return result

    def xor_encrypt(self, text: str) -> str:
        key = secrets.token_bytes(1)[0]
        return ''.join(chr(ord(c) ^ key) for c in text)

    def crc32_encrypt(self, text: str) -> str:
        return hex(zlib.crc32(text.encode()))[2:]

    def polybius_square_encrypt(self, text: str) -> str:
        square = {'a': '11', 'b': '12', 'c': '13', 'd': '14', 'e': '15',
                  'f': '21', 'g': '22', 'h': '23', 'i': '24', 'j': '24', 'k': '25',
                  'l': '31', 'm': '32', 'n': '33', 'o': '34', 'p': '35',
                  'q': '41', 'r': '42', 's': '43', 't': '44', 'u': '45',
                  'v': '51', 'w': '52', 'x': '53', 'y': '54', 'z': '55'}
        return ''.join(square.get(c.lower(), c) for c in text if c.isalpha() or c in square)

    def atbash_encrypt(self, text: str) -> str:
        alphabet = string.ascii_lowercase
        reverse = alphabet[::-1]
        trans_table = str.maketrans(alphabet + alphabet.upper(), reverse + reverse.upper())
        return text.translate(trans_table)

    def morse_encrypt(self, text: str) -> str:
        morse_dict = {
            'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.',
            'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
            'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---',
            'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
            'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--',
            'Z': '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
            '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
            '9': '----.'
        }
        return ' '.join(morse_dict.get(c.upper(), c) for c in text if c.isalnum())

    def des_encrypt(self, text: str) -> str:
        key = secrets.token_bytes(8)
        cipher = DES.new(key, DES.MODE_ECB)
        padded_text = pad(text.encode(), DES.block_size)
        ciphertext = cipher.encrypt(padded_text)
        return base64.b64encode(ciphertext).decode()

    def aes_encrypt(self, text: str) -> str:
        key = secrets.token_bytes(16)
        cipher = AES.new(key, AES.MODE_ECB)
        padded_text = pad(text.encode(), AES.block_size)
        ciphertext = cipher.encrypt(padded_text)
        return base64.b64encode(ciphertext).decode()

    def blowfish_encrypt(self, text: str) -> str:
        key = secrets.token_bytes(16)
        cipher = Blowfish.new(key, Blowfish.MODE_ECB)
        padded_text = pad(text.encode(), Blowfish.block_size)
        ciphertext = cipher.encrypt(padded_text)
        return base64.b64encode(ciphertext).decode()

    def frequency_substitution_encrypt(self, text: str) -> str:
        freq_map = {'e': 'x', 't': 'y', 'a': 'z', 'o': 'w', 'i': 'v'}
        trans_table = str.maketrans(freq_map)
        return text.translate(trans_table)

    def blake_encrypt(self, text: str) -> str:
        salt = secrets.token_hex(8)
        return hashlib.blake2b((text + salt).encode()).hexdigest()

    def blake2_encrypt(self, text: str) -> str:
        return hashlib.blake2b(text.encode()).hexdigest()

    def blake3_encrypt(self, text: str) -> str:
        salt = secrets.token_hex(8)
        hashed = hashlib.blake2s((text + salt).encode()).hexdigest()
        return hashed[::-1]

    def chacha20_encrypt(self, text: str) -> str:
        key = secrets.token_bytes(32)
        nonce = secrets.token_bytes(12)
        cipher = ChaCha20.new(key=key, nonce=nonce)
        ciphertext = cipher.encrypt(text.encode())
        return base64.b64encode(ciphertext).decode()

    def chacha12_encrypt(self, text: str) -> str:
        key = secrets.token_bytes(32)
        nonce = secrets.token_bytes(12)
        cipher = ChaCha20.new(key=key, nonce=nonce)
        ciphertext = cipher.encrypt(text.encode())
        return base64.b64encode(ciphertext).decode()

    def salsa20_encrypt(self, text: str) -> str:
        key = secrets.token_bytes(32)
        nonce = secrets.token_bytes(8)
        cipher = Salsa20.new(key=key, nonce=nonce)
        ciphertext = cipher.encrypt(text.encode())
        return base64.b64encode(ciphertext).decode()

    def rc4_encrypt(self, text: str) -> str:
        key = secrets.token_bytes(16)
        cipher = ARC4.new(key)
        ciphertext = cipher.encrypt(text.encode())
        return base64.b64encode(ciphertext).decode()

    def ecc_encrypt(self, text: str) -> str:
        key = ECC.generate(curve='P-256')
        public_key = key.public_key()
        symmetric_key = get_random_bytes(16)
        cipher = AES_Cipher.new(symmetric_key, AES_Cipher.MODE_EAX)
        nonce = cipher.nonce
        ciphertext, tag = cipher.encrypt_and_digest(text.encode())
        shared_secret = get_random_bytes(32)
        ephemeral_key = ECC.generate(curve='P-256')
        encrypted_key = base64.b64encode(shared_secret).decode()
        combined = base64.b64encode(nonce + tag + ciphertext + shared_secret).decode()
        return combined

    def elgamal_encrypt(self, text: str) -> str:
        # 生成 ElGamal 密鑰對
        key = ElGamal.generate(256, secrets.token_bytes)
        public_key = key.publickey()
        
        # 使用 AES 加密文本
        symmetric_key = get_random_bytes(16)
        cipher = AES_Cipher.new(symmetric_key, AES_Cipher.MODE_EAX)
        nonce = cipher.nonce
        ciphertext, tag = cipher.encrypt_and_digest(text.encode())
        
        # 模擬 ElGamal 加密對稱密鑰（簡化）
        k = secrets.randbelow(key.p - 1)
        c1 = pow(key.g, k, key.p)
        c2 = (pow(key.y, k, key.p) * int.from_bytes(symmetric_key, 'big')) % key.p
        encrypted_key = f"{c1}:{c2}"
        
        # 組合密文
        combined = base64.b64encode(nonce + tag + ciphertext + encrypted_key.encode()).decode()
        return combined

    def triple_des_encrypt(self, text: str) -> str:
        key = secrets.token_bytes(24)  # 3DES 需要 24 字節密鑰
        cipher = DES3.new(key, DES3.MODE_ECB)
        padded_text = pad(text.encode(), DES3.block_size)
        ciphertext = cipher.encrypt(padded_text)
        return base64.b64encode(ciphertext).decode()

    def camellia_encrypt(self, text: str) -> str:
        key = secrets.token_bytes(16)  # Camellia-128 需要 16 字節密鑰
        cipher = Camellia.new(key, Camellia.MODE_ECB)
        padded_text = pad(text.encode(), Camellia.block_size)
        ciphertext = cipher.encrypt(padded_text)
        return base64.b64encode(ciphertext).decode()

    def eddsa_sign(self, text: str) -> str:
        # 使用 Ed25519 進行簽名
        key = ECC.generate(curve='Ed25519')
        signer = eddsa.new(key, 'rfc8032')
        h = SHA256.new(text.encode())
        signature = signer.sign(h)
        return base64.b64encode(signature).decode()

    def add_encryption_method(self, name: str, method: Callable[[str], str]) -> None:
        """允許添加新的加密方法"""
        self.encryption_methods[name] = method
        self.available_methods.append(name)

    def encrypt_password(self, password: str, layers: list, show_encryption_step: bool = True) -> tuple[str, list]:
        """執行多層加密"""
        result = password
        used_methods = []
        if show_encryption_step:
            print("\nEncryption Steps:")
            print(f"Initial input: {result}")
        for i, layer in enumerate(layers):
            if layer == 'random':
                available = [m for m in self.available_methods if m not in used_methods]
                if not available:
                    raise ValueError("No more unique encryption methods available.")
                method_name = secrets.choice(available)
            else:
                if layer not in self.encryption_methods:
                    raise ValueError(f"Invalid encryption method: {layer}")
                method_name = layer
            result = self.encryption_methods[method_name](result)
            used_methods.append(method_name)
            if show_encryption_step:
                print(f"Layer {i+1} ({method_name}): {result}")
        return result, used_methods

def main():
    encryptor = PasswordEncryptor()
    
    print(f"Available encryption methods (total {len(encryptor.available_methods)}): {', '.join(encryptor.available_methods)}")
    
    try:
        num_layers = int(input("Enter the number of encryption layers: "))
        if num_layers < 1:
            raise ValueError("Number of layers must be at least 1.")
        
        layers = []
        randomize_all = input("\nUse 'random-all' for all layers random, or 'manual' for manual selection: ").lower()
        if randomize_all == 'random-all':
            layers = ['random' for _ in range(num_layers)]
        elif randomize_all == 'manual':
            for i in range(num_layers):
                print(f"\nLayer {i+1}:")
                choice = input("Enter encryption method (or 'random' for random selection): ").lower()
                if choice not in encryptor.available_methods and choice != 'random':
                    print(f"Invalid method. Choose from {encryptor.available_methods} or 'random'.")
                    i -= 1
                    continue
                layers.append(choice)
        else:
            raise ValueError("Invalid choice. Enter 'random-all' or 'manual'.")
        
        password = input("\nEnter the password to encrypt: ")
        if not password:
            raise ValueError("Password cannot be empty.")
        
        show_steps = input("\nShow encryption steps for each layer? (true/false): ").lower()
        if show_steps not in ['true', 'false']:
            raise ValueError("Invalid choice. Enter 'true' or 'false'.")
        show_encryption_step = show_steps == 'true'
        
        encrypted_password, used_methods = encryptor.encrypt_password(password, layers, show_encryption_step)
        
        print("\nEncryption Results:")
        print(f"Original password: {password}")
        print(f"Encrypted password: {encrypted_password}")
        print("Encryption methods used (in order):", ", ".join(used_methods))
        
    except ValueError as e:
        print(f"Error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    main()
