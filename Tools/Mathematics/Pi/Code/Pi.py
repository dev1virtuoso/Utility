import decimal
import math
import time
from joblib import Parallel, delayed
import numpy as np
import multiprocessing

def calculate_term(k):
    numerator = decimal.Decimal(math.factorial(4*k)) * (1103 + 26390*k)
    denominator = (decimal.Decimal(math.factorial(k))**4) * decimal.Decimal(396**(4*k))
    return numerator / denominator

def calculate_pi(prec):
    decimal.getcontext().prec = prec
    num_cores = np.minimum(multiprocessing.cpu_count(), 8)
    s = decimal.Decimal(0)
    with open(f"pi_{prec}.txt", "w") as f:
        results = Parallel(n_jobs=num_cores)(delayed(calculate_term)(i) for i in range(prec))
        for i, term in enumerate(results, 1):
            s += term
            if i % 100 == 0:
                inverse_pi = (2 * decimal.Decimal(math.sqrt(2))) / decimal.Decimal(9801) * s
                pi = 1 / inverse_pi
                f.write(f"{i}: {pi}\n")
                progress = decimal.Decimal(i) / decimal.Decimal(prec) * 100
                print(f"Current progress: {progress}%")
    
    inverse_pi = (2 * decimal.Decimal(math.sqrt(2))) / decimal.Decimal(9801) * s
    pi = 1 / inverse_pi
    with open(f"pi_{prec}.txt", "w") as f:
        f.write(f"{prec}: {pi}\n")
    return pi

if __name__ == '__main__':
    start_time = time.time()

    prec = 10000
    pi = calculate_pi(prec)

    end_time = time.time()
    total_time = end_time - start_time
    print(f"Time taken: {end_time - start_time} seconds")
    print(f"Calculated pi value up to {prec} decimal places.")
