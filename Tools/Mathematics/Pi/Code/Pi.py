import decimal
import math
import multiprocessing
import time

def calculate_term(k):
    numerator = decimal.Decimal(math.factorial(4*k)) * (1103 + 26390*k)
    denominator = (decimal.Decimal(math.factorial(k))**4) * decimal.Decimal(396**(4*k))
    return numerator / denominator

def calculate_pi(prec, num_processes):
    decimal.getcontext().prec = prec
    pool = multiprocessing.Pool(processes=num_processes)
    s = decimal.Decimal(0)
    with open("pi.txt", "w") as f:
        for i, term in enumerate(pool.imap_unordered(calculate_term, range(0, prec)), 1):
            s += term
            if i % 100 == 0:
                inverse_pi = (2 * decimal.Decimal(math.sqrt(2))) / decimal.Decimal(9801) * s
                pi = 1 / inverse_pi
                f.write(f"{i}: {pi}\n")
                progress = decimal.Decimal(i) / decimal.Decimal(prec) * 100
                print(f"Current progress: {progress}%")
    pool.close()
    pool.join()
    inverse_pi = (2 * decimal.Decimal(math.sqrt(2))) / decimal.Decimal(9801) * s
    pi = 1 / inverse_pi
    with open("pi.txt", "w") as f:
        f.write(f"{prec}: {pi}\n")
    return pi

if __name__ == '__main__':
    start_time = time.time()

    prec = 1000000
    num_processes = 8
    pi = calculate_pi(prec, num_processes)

    end_time = time.time()
    print(f"Time taken: {end_time - start_time} seconds")
    print(f"Calculated pi value up to {prec} decimal places.")
