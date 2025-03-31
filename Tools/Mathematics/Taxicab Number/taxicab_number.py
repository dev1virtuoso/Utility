import time
import multiprocessing
from multiprocessing import Lock

lock = Lock()  # Create a lock for file writing

def is_taxicab_number(num):
    # Check if a number is a taxicab number
    sum_of_cubes = lambda x, y: x**3 + y**3
    pairs = []
    limit = int(num ** (1/3)) + 1  # Iterate only up to the cube root of the number
    for i in range(1, limit):
        for j in range(i, limit):
            if sum_of_cubes(i, j) == num:
                pairs.append((i, j))
                if len(pairs) > 1:  # If there are more than one distinct pairs
                    return True
    return False

def find_taxicab_numbers(output_file, start_time):
    num = 1  # Start from the first number
    count = 0
    while True:  # Infinite loop, unless manually stopped
        if is_taxicab_number(num):
            count += 1
            elapsed_time = time.time() - start_time
            with lock:  # Lock to ensure thread-safe file writing
                with open(output_file, 'a') as file:
                    file.write(f"Time Elapsed: {elapsed_time:.2f} seconds - The {count}th taxicab number is: {num}\n")
        num += 1  # Increment to check the next number

if __name__ == '__main__':
    start_time = time.time()  # Record the start time
    output_file = 'taxicab_numbers.txt'
    num_processes = 4  # Adjust based on available CPU cores

    processes = []
    for i in range(num_processes):
        p = multiprocessing.Process(target=find_taxicab_numbers, args=(output_file, start_time))
        processes.append(p)
        p.start()

    for p in processes:
        p.join()

    print("All processes completed.")