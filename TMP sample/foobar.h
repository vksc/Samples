#ifndef FOOBAR_H_INCLUDED
#define FOOBAR_H_INCLUDED
#include <iostream>
#include <string>

template <int N, bool isFoo = N%3 == 0, bool isBar = N%5 == 0>
struct outer
{
};

template <int N>
struct outer <N, false, false>
{
	static const int value = N;
};

template <int N>
struct outer <N, true, false >
{
	static const std::string value;
};

template <int N>
struct outer <N, false, true>
{
	static const std::string value;
};

template <int N>
struct outer <N, true, true>
{
	static const std::string value;
};

template<int N>
const std::string outer<N, true, false>::value = "Foo";

template<int N>
const std::string outer<N, false, true>::value = "Bar";

template<int N>
const std::string outer<N, true, true>::value = "FooBar";

template<int N>
void Print()
{
	Print<N - 1>();

	using out = outer<N>;

	std::cout << out::value << std::endl;
}

template <>
void Print<0>()
{};


#endif // FOOBAR_H_INCLUDED
