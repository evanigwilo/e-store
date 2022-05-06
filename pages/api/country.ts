// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { AxiosError } from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { CountryType, KeyValue } from "../../utils/types";
import axios from "../../services/axios";

// 👇 sample api to fetch supported delivery countries
export default async function country(
  req: NextApiRequest,
  res: NextApiResponse<CountryType | KeyValue>
) {
  try {
    console.log({ url: axios.defaults.baseURL });
    const { data } = await axios.get<CountryType>("/country");
    res.status(200).json(data);
  } catch (error) {
    const response = (error as AxiosError).response;
    return response?.data as KeyValue;
  }
}
