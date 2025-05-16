import axios, { AxiosRequestHeaders, Method } from 'axios';

const axiosInstance = axios.create(
  {
    withCredentials: true,  // <-- this is essential for cookies
  }
); 

export const apiConnector = (
  method: Method,
  url: string,
  bodyData?: any,
  headers?: AxiosRequestHeaders,
  params?: Record<string, any>
) => {
  return axiosInstance({
    method,
    url,
    data: bodyData || null,
    headers: headers || {},
    params: params || {},
  });
};