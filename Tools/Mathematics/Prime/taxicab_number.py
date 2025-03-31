import time
import multiprocessing
from multiprocessing import Lock

lock = Lock()  # 創建文件寫入鎖定

def is_taxicab_number(num):
    # 判斷是否為計程車數
    sum_of_cubes = lambda x, y: x**3 + y**3
    pairs = []
    limit = int(num ** (1/3)) + 1
    for i in range(1, limit):
        for j in range(i, limit):
            if sum_of_cubes(i, j) == num:
                pairs.append((i, j))
                if len(pairs) > 1:
                    return True
    return False

def find_taxicab_numbers(output_file, start_time):
    num = 1
    count = 0
    while True:
        if is_taxicab_number(num):
            count += 1
            elapsed_time = time.time() - start_time
            print(f"Time Elapsed: {elapsed_time:.2f} seconds - The {count}th taxicab number is: {num}")
            with lock:
                with open(output_file, 'a') as file:
                    file.write(f"Time Elapsed: {elapsed_time:.2f} seconds - The {count}th taxicab number is: {num}\n")
        num += 1

if __name__ == '__main__':
    start_time = time.time()
    output_file = 'taxicab_numbers.txt'
    num_processes = 8

    processes = []
    for i in range(num_processes):
        p = multiprocessing.Process(target=find_taxicab_numbers, args=(output_file, start_time))
        processes.append(p)
        p.start()

    for p in processes:
        p.join()