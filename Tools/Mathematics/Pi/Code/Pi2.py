# Copyright © 2024 Carson. All rights reserved.

import decimal

def calculate_pi():
    decimal.getcontext().prec = 100_000  
    s = decimal.Decimal(0)
    for k in range(100):
        numerator = decimal.Decimal(decimal.math.factorial(4*k)) * (1103 + 26390*k)
        denominator = (decimal.Decimal(decimal.math.factorial(k))**4) * decimal.Decimal(396**(4*k))
        s += numerator / denominator
    inverse_pi = (2 * decimal.Decimal(decimal.math.sqrt(2))) / decimal.Decimal(9801) * s
    pi = 1 / inverse_pi
    return pi

pi = calculate_pi()

print("The value of π is:", pi)
