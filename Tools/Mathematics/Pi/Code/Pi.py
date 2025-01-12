import decimal
import math
import time
import numba
from numba import cuda

@cuda.jit(device=True)
def calculate_term(k):
    numerator = decimal.Decimal(math.factorial(4*k)) * (1103 + 26390*k)
    denominator = (decimal.Decimal(math.factorial(k))**4) * decimal.Decimal(396**(4*k))
    return numerator / denominator

@cuda.jit
def calculate_pi_kernel(prec, s):
    i = cuda.grid(1)
    if i < prec:
        term = calculate_term(i)
        cuda.atomic.add(s, 0, term)

def calculate_pi(prec):
    decimal.getcontext().prec = prec
    threads_per_block = 128
    blocks_per_grid = (prec + threads_per_block - 1) // threads_per_block
    s = cuda.atomic.empty_like(decimal.Decimal(0))
    s[0] = decimal.Decimal(0)
    calculate_pi_kernel[blocks_per_grid, threads_per_block](prec, s)
    cuda.synchronize()
    
    inverse_pi = (2 * decimal.Decimal(math.sqrt(2))) / decimal.Decimal(9801) * s[0]
    pi = 1 / inverse_pi
    return pi

if __name__ == '__main__':
    start_time = time.time()

    prec = 10000
    pi = calculate_pi(prec)

    end_time = time.time()
    print(f"Time taken: {end_time - start_time} seconds")
    print(f"Calculated pi value up to {prec} decimal places.")
