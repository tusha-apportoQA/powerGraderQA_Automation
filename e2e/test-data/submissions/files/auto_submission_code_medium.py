def max_sum_non_adjacent(nums):
    # Handle edge cases
    if len(nums) == 0:
        return 0
    elif len(nums) == 1:
        return max(nums[0], 0)

    prev_prev_sum = max(nums[0], 0)
    prev_sum = max(nums[0], nums[1], 0)

    for i in range(2, len(nums)):
        current_sum = max(prev_sum, prev_prev_sum + nums[i], 0)
        prev_prev_sum = prev_sum
        prev_sum = current_sum

    return prev_sum
print(max_sum_non_adjacent([2, 4, 6, 2, 5]))  # Output: 13
print(max_sum_non_adjacent([5, 1, 1, 5]))     # Output: 10
print(max_sum_non_adjacent([-1, -2, -3, -4])) # Output: 0
print(max_sum_non_adjacent([1, 2, 3, 4, 5]))  # Output: 9
