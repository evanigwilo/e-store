import axios from "axios";
import { apiVersion } from "../utils/constants";

export default axios.create({
  baseURL: process.env.NEXT_PUBLIC_SERVER_BASE_URL + apiVersion,
  // headers: {
  //   "Access-Control-Allow-Origin": "*",
  //   "Content-Type": "application/json",
  //   "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,PATCH,OPTIONS",
  // },
  withCredentials: true,
});
