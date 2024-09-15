# Pi

## Summary

### Pi.py

The file name is "Pi.py".

This script is used to calculate the value of the mathematical constant Pi (π). It utilizes multiprocessing and high-precision computation. During the execution, it writes the calculation results to a text file named "pi.txt" and outputs the progress of the calculation and the time taken.

### Pi2.py

The file name is "Pi2.py".

This script is used to calculate the value of the mathematical constant Pi (π). It employs high-precision computation and approximates the value of π through iterative calculations. During the execution, it prints the calculation results.

### Pi3.py

The file name is "Pi3.py".

This script is used to calculate the value of the mathematical constant Pi (π). It utilizes multiprocessing and high-precision computation. During the execution, it writes the calculation results to a text file named "pi.txt" and outputs the progress of the calculation and the time taken.

## Explanation

### Pi.py

```python
# Copyright © 2024 Carson. All rights reserved.

import decimal
import math
import multiprocessing
import time
```

This script is used to calculate an approximation of the value of Pi (π).

```python
def calculate_term(k):
    numerator = decimal.Decimal(math.factorial(4*k)) * (1103 + 26390*k)
    denominator = (decimal.Decimal(math.factorial(k))**4) * decimal.Decimal(396**(4*k))
    return numerator / denominator
```

The `calculate_term` function is used to calculate the value of each term. Based on the formula in Ramanujan's series, it calculates the values of the numerator and denominator and divides them to obtain one term of the approximation of Pi.

```python
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
                f.truncate(0)
                f.write(f"{i}: {pi}\n")
    pool.close()
    pool.join()
    inverse_pi = (2 * decimal.Decimal(math.sqrt(2))) / decimal.Decimal(9801) * s
    pi = 1 / inverse_pi
    with open("pi.txt", "w") as f:
        f.write(f"{prec}: {pi}\n")
    return pi
```

The `calculate_pi` function is used to calculate the approximation of Pi. It takes two parameters: `prec` represents the decimal precision of Pi to be calculated, and `num_processes` represents the number of processes to be used.

Inside the function, it first sets the calculation precision using `decimal.getcontext().prec`. Then, it creates a process pool `pool` using `multiprocessing.Pool` for parallel computation.

Next, it uses a loop to iterate and compute the value of each term. It applies the `calculate_term` function to each value in the range from 0 to `prec` using `pool.imap_unordered`, which parallelizes the computation of the terms. It uses the `enumerate` function to get the index `i` and value `term` of each term.

During the computation, it accumulates the value of each term into the variable `s`. When the value of `i` is a multiple of 100, it means that 100 terms have been calculated. At this point, it calculates the approximation of Pi based on the current accumulation sum `s`. By applying the reverse operation of Ramanujan's formula, it calculates the value of inverse Pi `inverse_pi`, and then takes the reciprocal to obtain the approximation of Pi `pi`.

After calculating each approximation value, it writes it to the file "pi.txt" and truncates the file to remove previous values. It also prints the current progress on the console.

Once the computation is complete, it closes the process pool and performs the final calculation to obtain the final approximation of Pi. Then, it writes the final approximation value to the file "pi.txt".

Finally, it returns the approximation of Pi `pi`.

```python
if __name__ == '__main__':
    start_time = time.time()

    prec = 100000
    num_processes = 8
    pi = calculate_pi(prec, num_processes)

    end_time = time.time()
    print(f"Time taken: {end_time - start_time} seconds")
    print(f"Calculated pi value up to {prec} decimal places.")
```

In the main program of the script, the precision `prec` is set to 100,000, and 8 processes `num_processes` are used for parallel computation. Then, the `calculate_pi` function is called to perform the calculation of Pi.

After the computation is complete, the time taken for the calculation is calculated and printed, along with the number of decimal places of the calculated approximation of Pi.

### Pi3.py

```python
# Copyright © 2024 Carson. All rights reserved.

import decimal
import math
import multiprocessing
import time
```

This script is used to calculate an approximation of the value of Pi (π).

```python
def calculate_term(k):
    numerator = decimal.Decimal(math.factorial(4*k)) * (1103 + 26390*k)
    denominator = (decimal.Decimal(math.factorial(k))**4) * decimal.Decimal(396**(4*k))
    return numerator / denominator
```

The `calculate_term` function is used to calculate the value of each term. Based on the formula in Ramanujan's series, it calculates the values of the numerator and denominator and divides them to obtain one term of the approximation of Pi.

```python
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
```

The `calculate_pi` function is used to calculate the approximation of Pi. It takes two parameters: `prec` represents the decimal precision of Pi to be calculated, and `num_processes` represents the number of processes to be used.

Inside the function, it first sets the calculation precision using `decimal.getcontext().prec`. Then, it creates a process pool `pool` using `multiprocessing.Pool` for parallel computation.

Next, it uses a loop to iterate and compute the value of each term. It applies the `calculate_term` function to each value in the range from 0 to `prec` using `pool.imap_unordered`, which parallelizes the computation of the terms. It uses the `enumerate` function to get the index `i` and value `term` of each term.

During the computation, it accumulates the value of each term into the variable `s`. When the value of `i` is a multiple of 100, it means that 100 terms have been calculated. At this point, it calculates the approximation of Pi based on the current accumulation sum `s`. By applying the reverse operation of Ramanujan's formula, it calculates the value of inverse Pi `inverse_pi`, and then takes the reciprocal to obtain the approximation of Pi `pi`.

After calculating each approximation value, it writes it to the file "pi.txt" and prints the current progress on the console.

Once the computation is complete, it closes the process pool and performs the final calculation to obtain the final approximation of Pi. Then, it writes the final approximation value to the file "pi.txt".

Finally, it returns the approximation of Pi `pi`.

```python
if __name__ == '__main__':
    start_time = time.time()

    prec = 100000
    num_processes = 8
    pi = calculate_pi(prec, num_processes)

    end_time = time.time()
    print(f"Time taken: {end_time - start_time} seconds")
    print(f"Calculated pi value up to {prec} decimal places.")
```

In the main program of the script, the precision `prec` is set to 100,000, and 8 processes `num_processes` are used for parallel computation. Then, the `calculate_pi` function is called to perform the calculation of Pi.

After the computation is complete, the time taken for the calculation is calculated and printed, along with the number of decimal places of the calculated approximation of Pi.

## Differences

These three code files, "Pi.py," "Pi2.py," and "Pi3.py," are all programs used to calculate the value of Pi (π). However, they have some differences in functionality.

The "Pi.py" file utilizes multiprocessing to calculate Pi in parallel. It allows specifying the desired precision (prec) and the number of processes (num_processes) to use for computation. It writes the progress and the result of each accumulation term to the "pi.txt" file. Additionally, it also writes the final calculated result to the same file upon completion. Finally, the program outputs the time taken for computation and the precision of the calculation.

The "Pi2.py" file calculates Pi within a single process and uses a fixed number of iterations (100) for computation. It directly outputs the final calculated result to the terminal and displays it on the screen.

The "Pi3.py" file has similar functionality to "Pi.py" as it also uses multiprocessing for parallel computation of Pi, allowing specification of precision and the number of processes. However, the difference is that it clears the contents of the "pi.txt" file using `f.truncate(0)` before each write operation, ensuring that only the latest calculation result is retained. Finally, the program outputs the time taken for computation and the precision of the calculation.

In summary, the main differences among these three code files lie in the method of calculating Pi and the handling of output results. "Pi.py" uses multiprocessing and writes the calculation results to a file. "Pi2.py" directly outputs the result within a single process, while "Pi3.py" uses multiprocessing and clears the file contents before each write operation.

## Contributions

Contributions to Pi are welcome! If you have any suggestions, bug reports, or want to contribute new features, please feel free to submit a pull request. Together, we can enhance the functionality and usability of Pi.

## License

Pi is licensed under the The Carson Open Source License (CEOSL) (MPL) version 2.0.

The MPL is a copyleft license that allows you to use, modify, and distribute the software, as long as any modifications or derivative works you create are also licensed under the MPL. It provides a balance between the freedoms of open-source software and the protection of intellectual property rights.
