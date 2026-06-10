# Assignment function
def removeDuplicates(nums):
    for num in nums:
       if nums.count(num) > 1:
           nums.remove(num)
    return len(nums)

# Bonus function
def removeDuplicates2(nums2):
    index = -1
    duplicates = 0
    for num2 in nums2:
        index += 1
    savedIndex = index
    # Get the len of the new list
    while index > 0:
        len = 0
        if (nums2[index] == nums2[index - 1]):
            index -= 1
            continue
        else:
            len += 1
            index -= 1
    index = savedIndex
    # Move duplicate elements to the back of the list
    while index > 0:
        counter = 0
        if nums2[index] == nums2[index - 1]:
            temp = nums2[index]
            for num2 in nums2:
                if temp > nums2[counter]:
                    continue
                nums2[counter] = nums2[counter + 1]
            nums2[counter] = temp
            counter += 1
        index -= 1
    return len

# Assignment function test
nums = [1,1,3,4,4,4,5,6,8,8,9,11,11,24,25,26,26] # Create a test array here: ex [1,1,2,3]
expectedNums = [1,3,4,5,6,8,9,11,24,25,26] # Create an array with the correct result based on what you created for nums. ex [1,2,3]

k = removeDuplicates(nums) # Calls your implementation

assert k == len(expectedNums)
assert nums == expectedNums

# Bonus function test
nums2 = [1,1,1,3,4,5,5,7,9,9,23,23,25,35,36,36]
expectedNums2 = [1,3,4,5,7,9,23,25,35,36,1,1,5,9,23,36]

k2 = removeDuplicates2(nums2)

""" assert k2 == len(expectedNums2)
assert nums2 == expectedNums2 """
