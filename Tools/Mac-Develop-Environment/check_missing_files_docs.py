import os
import time
import argparse
from pathlib import Path
from multiprocessing import Pool, cpu_count
from functools import partial
import glob
import hashlib
import tempfile
import shutil
import fnmatch
from tqdm import tqdm
import logging

TARGET_DIR = "/path/to/directory"
INVENTORY_FILE = "/path/to/directory/file_inventory/.file_inventory.txt"
TEMP_FILE = "/path/to/directory/file_inventory/tmp/current_inventory.txt"
BACKUP_DIR = "/path/to/directory/file_inventory/backup"
LOG_FILE = os.path.join(BACKUP_DIR, "file_check.log")

if not os.path.isdir(TARGET_DIR):
    print(f"Error: Directory {TARGET_DIR} does not exist!")
    exit(1)

os.makedirs(BACKUP_DIR, exist_ok=True)
os.makedirs(os.path.dirname(TEMP_FILE), exist_ok=True)
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

def compute_file_hash(file_path):
    sha256 = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256.update(chunk)
        return sha256.hexdigest()
    except (OSError, PermissionError) as e:
        logging.warning(f"Failed to hash {file_path}: {e}")
        return None

def build_merkle_tree(hashes):
    if not hashes:
        return ""
    leaves = [hashlib.sha256(h.encode()).hexdigest() for h in hashes]
    while len(leaves) > 1:
        temp_leaves = []
        for i in range(0, len(leaves), 2):
            if i + 1 < len(leaves):
                combined = leaves[i] + leaves[i + 1]
                temp_leaves.append(hashlib.sha256(combined.encode()).hexdigest())
            else:
                temp_leaves.append(leaves[i])
        leaves = temp_leaves
    return leaves[0]

def process_directory(root, temp_dir, exclude_patterns=None):
    inventory = []
    temp_file = os.path.join(temp_dir, f"temp_inventory_{os.getpid()}.txt")
    try:
        with open(temp_file, "w") as f:
            for file in os.listdir(root):
                file_path = os.path.join(root, file)
                if exclude_patterns and any(fnmatch.fnmatch(file_path, pattern) for pattern in exclude_patterns):
                    continue
                try:
                    if os.path.isfile(file_path) and not os.path.islink(file_path):
                        stat = os.stat(file_path, follow_symlinks=False)
                        size = stat.st_size
                        mtime = int(stat.st_mtime)
                        file_hash = compute_file_hash(file_path)
                        if file_hash:
                            print(f"[{file_hash}] {file_path} checking")
                            logging.info(f"Checking file: {file_path} (hash: {file_hash})")
                            f.write(f"{size} {mtime} {file_hash} {file_path}\n")
                except (OSError, PermissionError) as e:
                    logging.warning(f"Error processing {file_path}: {e}")
                    pass
    except (OSError, PermissionError) as e:
        logging.error(f"Error writing to temp file {temp_file}: {e}")
        pass
    return temp_file

def generate_inventory(exclude_patterns=None):
    directories = []
    for root, dirs, _ in os.walk(TARGET_DIR, followlinks=False):
        if exclude_patterns and any(fnmatch.fnmatch(root, pattern) for pattern in exclude_patterns):
            continue
        directories.append(root)
    
    num_processes = cpu_count()
    print(f"Using {num_processes} CPU cores for parallel processing...")
    logging.info(f"Starting inventory generation with {num_processes} CPU cores")
    
    total_files = sum(len([f for f in os.listdir(d) if os.path.isfile(os.path.join(d, f)) and not any(fnmatch.fnmatch(os.path.join(d, f), p) for p in (exclude_patterns or []))]) for d in directories)
    
    with tempfile.TemporaryDirectory() as temp_dir:
        with Pool(processes=num_processes) as pool:
            with tqdm(total=total_files, desc="Generating Inventory", unit="file") as pbar:
                temp_files = pool.map(partial(process_directory, temp_dir=temp_dir, exclude_patterns=exclude_patterns), directories, chunksize=max(1, len(directories) // (num_processes * 4)))
                pbar.update(total_files)
        
        inventory = []
        file_hashes = []
        for temp_file in temp_files:
            if os.path.exists(temp_file):
                with open(temp_file, "r") as f:
                    for line in f:
                        if line.strip():
                            inventory.append(line.strip())
                            file_hashes.append(line.split(" ", 3)[2])
        
        inventory.sort(key=lambda x: x.split(" ", 3)[3])
        merkle_root = build_merkle_tree(file_hashes)
        
        with open(TEMP_FILE, "w") as f:
            f.write(f"# Merkle Root: {merkle_root}\n")
            f.write("\n".join(inventory) + "\n")
        logging.info(f"Inventory generated with Merkle root: {merkle_root}")

def backup_inventory(file_path):
    if os.path.isfile(file_path):
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        backup_path = os.path.join(BACKUP_DIR, f".file_inventory_{timestamp}.txt")
        with open(file_path, "r") as src, open(backup_path, "w") as dst:
            dst.write(src.read())
        print(f"Backup created at {backup_path}")
        logging.info(f"Backup created at {backup_path}")

def generate_report(missing_files, modified_files, report_file):
    with open(report_file, "w") as f:
        f.write(f"File Integrity Report - {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 50 + "\n")
        f.write(f"Target Directory: {TARGET_DIR}\n")
        f.write(f"Inventory File: {INVENTORY_FILE}\n")
        f.write(f"Generated: {time.ctime()}\n")
        f.write("=" * 50 + "\n\n")
        
        if missing_files:
            f.write("Missing or Deleted Files:\n")
            for path in missing_files:
                f.write(f"{path}\n")
            f.write("\n")
        else:
            f.write("No missing or deleted files.\n\n")
        
        if modified_files:
            f.write("Modified Files:\n")
            for path in modified_files:
                f.write(f"{path}\n")
            f.write("\n")
        else:
            f.write("No modified files.\n\n")
    
    print(f"Report generated at {report_file}")
    logging.info(f"Report generated at {report_file}")

def restore_files(missing_files, backup_source):
    if not os.path.isdir(backup_source):
        print(f"Error: Backup source {backup_source} does not exist!")
        logging.error(f"Backup source {backup_source} does not exist")
        return
    
    restored = 0
    for path in missing_files:
        rel_path = os.path.relpath(path, TARGET_DIR)
        backup_path = os.path.join(backup_source, rel_path)
        if os.path.isfile(backup_path):
            try:
                os.makedirs(os.path.dirname(path), exist_ok=True)
                shutil.copy2(backup_path, path)
                print(f"Restored: {path}")
                logging.info(f"Restored file: {path} from {backup_path}")
                restored += 1
            except (OSError, PermissionError) as e:
                print(f"Failed to restore {path}: {e}")
                logging.error(f"Failed to restore {path}: {e}")
        else:
            print(f"Backup not found for {path}")
            logging.warning(f"Backup not found for {path}")
    
    print(f"Restored {restored} of {len(missing_files)} missing files")
    logging.info(f"Restored {restored} of {len(missing_files)} missing files")

def check_missing_files(exclude_patterns=None):
    if not os.path.isfile(INVENTORY_FILE):
        print("No previous inventory found. Creating new inventory...")
        logging.info("No previous inventory found, creating new")
        generate_inventory(exclude_patterns)
        with open(TEMP_FILE, "r") as src, open(INVENTORY_FILE, "w") as dst:
            dst.write(src.read())
        print(f"Inventory created at {INVENTORY_FILE}")
        logging.info(f"Inventory created at {INVENTORY_FILE}")
        backup_inventory(INVENTORY_FILE)
        return 0, [], []

    generate_inventory(exclude_patterns)

    with open(TEMP_FILE, "r") as f:
        current_lines = [line.strip() for line in f if not line.startswith("#")]
        current_lines = sorted(current_lines, key=lambda x: x.split(" ", 3)[3] if x else "")
    with open(INVENTORY_FILE, "r") as f:
        previous_lines = [line.strip() for line in f if not line.startswith("#")]
        previous_lines = sorted(previous_lines, key=lambda x: x.split(" ", 3)[3] if x else "")

    missing_files = []
    modified_files = []
    current_dict = {line.split(" ", 3)[3]: line for line in current_lines if line}
    previous_dict = {line.split(" ", 3)[3]: line for line in previous_lines if line}

    print("Checking for missing or modified files...")
    logging.info("Starting file check")
    with tqdm(total=len(previous_lines), desc="Checking Files", unit="file") as pbar:
        for line in previous_lines:
            if not line:
                pbar.update(1)
                continue
            file_hash, file_path = line.split(" ", 3)[2:4]
            print(f"[{file_hash}] {file_path} checking")
            if line not in current_lines:
                print(f"[{file_hash}] {file_path} missing")
                logging.info(f"[{file_hash}] {file_path} missing")
                missing_files.append(file_path)
            else:
                print(f"[{file_hash}] {file_path} exists")
                logging.info(f"[{file_hash}] {file_path} exists")
            pbar.update(1)

    for path in current_dict:
        if path in previous_dict:
            curr_size, curr_mtime, curr_hash, _ = current_dict[path].split(" ", 3)
            prev_size, prev_mtime, prev_hash, _ = previous_dict[path].split(" ", 3)
            if curr_hash != prev_hash or curr_size != prev_size or curr_mtime != prev_mtime:
                modified_files.append(path)
                print(f"[{curr_hash}] {path} modified")
                logging.info(f"[{curr_hash}] {path} modified")

    issues_found = bool(missing_files or modified_files)
    if not issues_found:
        print("No files are missing, deleted, or modified!")
        logging.info("No files are missing, deleted, or modified")
    
    return int(issues_found), missing_files, modified_files

def main():
    parser = argparse.ArgumentParser(description="Check for missing or modified files and update inventory")
    parser.add_argument("update_choice", nargs="?", default="prompt", help="Set to 'y' to update inventory, 'n' to skip, or 'prompt' for interactive (ignored, always prompts)")
    parser.add_argument("--backup-source", help="Directory to restore missing files from")
    parser.add_argument("--report-file", default=os.path.join(BACKUP_DIR, f"report_{time.strftime('%Y%m%d_%H%M%S')}.txt"), help="File to save the report")
    parser.add_argument("--exclude", nargs="*", default=[], help="File or directory patterns to exclude (e.g., '*.log', '/path/to/dir/*')")
    args = parser.parse_args()

    exclude_patterns = args.exclude if args.exclude else None
    if exclude_patterns:
        print(f"Excluding patterns: {', '.join(exclude_patterns)}")
        logging.info(f"Excluding patterns: {', '.join(exclude_patterns)}")

    update_choice = input(f"Do you want to update the file inventory for {TARGET_DIR}? (y/n) ")
    logging.info(f"User prompted for update choice, selected: {update_choice}")

    result, missing_files, modified_files = check_missing_files(exclude_patterns)

    if args.report_file:
        generate_report(missing_files, modified_files, args.report_file)

    if args.backup_source and missing_files:
        restore_choice = input(f"Do you want to restore {len(missing_files)} missing files from {args.backup_source}? (y/n) ")
        logging.info(f"User prompted for restore choice, selected: {restore_choice}")
        if restore_choice.lower().startswith("y"):
            restore_files(missing_files, args.backup_source)

    if update_choice.lower().startswith("y"):
        if result == 0:
            print("No files are missing or modified. Deleting old inventory and updating...")
            logging.info("No files missing or modified, deleting old inventory")
            if os.path.isfile(INVENTORY_FILE):
                os.remove(INVENTORY_FILE)
                print(f"Deleted old inventory: {INVENTORY_FILE}")
                logging.info(f"Deleted old inventory: {INVENTORY_FILE}")
            backup_inventory(TEMP_FILE)
            with open(TEMP_FILE, "r") as src, open(INVENTORY_FILE, "w") as dst:
                dst.write(src.read())
            print(f"Inventory updated at {INVENTORY_FILE}")
            logging.info(f"Inventory updated at {INVENTORY_FILE}")
        else:
            if missing_files:
                print(f"Inventory not updated because {len(missing_files)} files are missing or deleted.")
                logging.info(f"Inventory not updated due to {len(missing_files)} missing files")
            if modified_files:
                print(f"Inventory not updated because {len(modified_files)} files are modified.")
                logging.info(f"Inventory not updated due to {len(modified_files)} modified files")
    else:
        print("Skipping inventory update. Checking for missing or modified files only...")
        logging.info("Skipping inventory update")

    if os.path.exists(TEMP_FILE):
        os.remove(TEMP_FILE)
        logging.info(f"Removed temporary file: {TEMP_FILE}")

    for f in glob.glob(f"{BACKUP_DIR}/.file_inventory_*.txt"):
        if os.path.getmtime(f) < time.time() - 30 * 24 * 3600:
            os.remove(f)
            print(f"Deleted old backup: {f}")
            logging.info(f"Deleted old backup: {f}")

if __name__ == "__main__":
    main()
