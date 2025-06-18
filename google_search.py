from googlesearch import search

def return_url(query, n):
    url_set = set()
    for j in search(query, num_results=n):
        url_set.add(j)
    return url_set

print(return_url("calgary", 10))