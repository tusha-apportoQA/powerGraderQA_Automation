def palindrome(digit):
    
    def adjascent_digit(a):
        adj=''
        if a !='0' and a !='a' and a!='A':
            adj = chr(ord(a)-1)
        elif a == '0':
            adj = '1'
        else: # the 'A' or 'a' case
            adj = '9'
        return adj
        
    length = len(digit)
    assert length <= 18 and length > 0
    if length == 1: # single digit case
        return adjascent_digit(digit)
    else: # multiple digits case
        pal_digit = list(digit)
        # checking if number is already a palindrome
        already_palindrome = True
        for i in range(length//2):
            if pal_digit[i] != pal_digit[-1*(i) -1]:
                already_palindrome = False
                break
        # if number is already a palindrome, we need to find the closest adjascent palindrome
        if already_palindrome:
            if length %2 ==0: # for even lengths, alter the middle two digits
                pal_digit[length//2 - 1] = adjascent_digit(pal_digit[length//2 - 1])
            pal_digit[length//2] =   adjascent_digit(pal_digit[length//2])
        
        else: # not already a palindrome
            for i in range(len(digit)//2):
                pal_digit[-1*i -1] = digit[i] 
        
        return(''.join(pal_digit))



if __name__=="__main__":    
    test_cases = ['0', '9', 'A', 'DEADBEEF', 'C008FE', 'DEADBEEFFEEBDAED', 'DEADBEEFAFEEBDAED']
    
    for tc in test_cases:
        print(tc, palindrome(tc))
