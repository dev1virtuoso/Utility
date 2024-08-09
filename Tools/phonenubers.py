import phonenumbers
from phonenumbers import geocoder

phone_number1 = phonenumbers.parse("PHONE_NUMBER_1")
phone_number2 = phonenumbers.parse("PHONE_NUMBER_2")

print("\nPhone Numbers Location\n")
print(geocoder.description_for_number(phone_number1, "en"))
print(geocoder.description_for_number(phone_number2, "en"))
