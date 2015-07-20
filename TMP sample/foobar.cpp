// tlab.cpp : Defines the entry point for the console application.
//

#include "stdafx.h"
#include <iostream>
#include <string>

using namespace std;

template <int N, bool F, bool B>
struct outer
{	
};

template <int N>
struct outer <N, false, false >
{
	static const int value = N;
};

template <int N>
struct outer <N, true, false >
{
	static const string value;
};

template <int N>
struct outer <N, false, true>
{
	static const string value;
};

template <int N>
struct outer <N, true, true>
{
	static const string value;
};

template<int N>
const string outer<N, true, false>::value = "Foo";

template<int N>
const string outer<N, false, true>::value = "Bar";

template<int N>
const string outer<N, true, true>::value = "FooBar";

template<int N> 
void Print()
{
	Print<N - 1>();
	
	using out = outer<N, N%3 == 0, N%5 == 0>;

	cout << out::value << endl;
}

template <>
void Print<0>()
{};

int _tmain(int argc, _TCHAR* argv[])
{
	Print<100>();
	return 0;
}

