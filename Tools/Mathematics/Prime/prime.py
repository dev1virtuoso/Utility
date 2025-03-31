import time
from multiprocessing import Pool

def is_prime(num):
    if num < 2:
        return False
    for i in range(2, int(num ** 0.5) + 1):
        if num % i == 0:
            return False
    return True

def find_prime(start_number):
    start_time = time.time()
    count = 0
    number = start_number
    prime_list = []

    while True:
        if is_prime(number):
            count += 1
            current_time = time.time()
            elapsed_time = current_time - start_time
            prime_list.append((count, number, elapsed_time))
            print(f'Time Elapsed: {elapsed_time:.2f} seconds - The {count}th prime number is: {number}')
            
            if count % 1000 == 0:
                with open("prime_numbers.txt", "a") as file:
                    for prime in prime_list:
                        file.write(f'Time Elapsed: {prime[2]:.2f} seconds - The {prime[0]}th prime number is: {prime[1]}\n')
                prime_list = []
                
        number += 1

if __name__ == '__main__':
    start_numbers = [1 + i for i in range(8)]
    pool = Pool(processes=8)
    
    try:
        while True:
            results = pool.map(find_prime, start_numbers)
    except KeyboardInterrupt:
        pool.terminate()
        pool.join()