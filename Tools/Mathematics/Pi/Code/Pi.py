import os
import decimal
import math
import multiprocessing
import time
import sys

def calculate_term(k):
    numerator = decimal.Decimal(math.factorial(4*k)) * (1103 + 26390*k)
    denominator = (decimal.Decimal(math.factorial(k))**4) * decimal.Decimal(396**(4*k))
    return numerator / denominator

def calculate_pi(prec, log_path):
    decimal.getcontext().prec = prec
    num_processes = min(multiprocessing.cpu_count(), 8)
    pool = multiprocessing.Pool(processes=num_processes)
    s = decimal.Decimal(0)
    
    pi_path = os.path.join(os.path.dirname(log_path), "pi.txt")
    
    with open(log_path, "w") as f_log:
        start_time = time.time()
        
        for i, term in enumerate(pool.imap_unordered(calculate_term, range(0, prec)), 1):
            s += term
            if i % 100 == 0:
                inverse_pi = (2 * decimal.Decimal(math.sqrt(2))) / decimal.Decimal(9801) * s
                pi = 1 / inverse_pi
                
                with open(pi_path, "w") as f_pi:
                    f_pi.write(f"{i}: {pi}\n")
                
                progress = decimal.Decimal(i) / decimal.Decimal(prec) * 100
                print(f"\rCurrent progress: {progress:.2f}% - Updated pi.txt (only {i} terms kept)", end="")
                sys.stdout.flush()
                f_log.write(f"Iteration {i}: {time.strftime('%Y-%m-%d %H:%M:%S')} - Calculated pi: {pi}\n")
    
    pool.close()
    pool.join()
    
    inverse_pi = (2 * decimal.Decimal(math.sqrt(2))) / decimal.Decimal(9801) * s
    pi = 1 / inverse_pi
    with open(pi_path, "w") as f_pi:  # 這裡也是 "w"，不是 "a"
        f_pi.write(f"{prec}: {pi}\n")
        
    return pi

if __name__ == '__main__':
    start_time = time.time()

    prec = 100001
    log_dir = os.getcwd()
    log_path = os.path.join(log_dir, "log.txt")
    
    os.makedirs(log_dir, exist_ok=True)
    
    pi = calculate_pi(prec, log_path)

    end_time = time.time()
    total_time = end_time - start_time
    total_time_str = f"{total_time:.3f} seconds"
    
    print("\n")
    print(f"Time taken: {total_time_str}")
    print(f"Calculated pi up to {prec} terms.")
    print("Final result saved in pi.txt → ONLY the latest line is kept!")
    
    with open(log_path, "a") as log_file:
        log_file.write(f"Program completed at {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        log_file.write(f"Total execution time: {total_time_str}\n")
