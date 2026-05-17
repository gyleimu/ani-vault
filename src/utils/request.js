/**
 * Axios 请求封装
 * 统一处理请求/响应拦截、错误处理、Token 管理
 */
import axios from 'axios'

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // TODO: 从 store 获取 token 并添加到请求头
    // const token = useUserStore().token
    // if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { data } = response
    // 根据后端约定的 code 判断请求是否成功
    if (data.code === 0 || data.code === 200) {
      return data
    }
    return Promise.reject(new Error(data.message || '请求失败'))
  },
  (error) => {
    const { response } = error
    if (response) {
      switch (response.status) {
        case 401:
          // TODO: 处理未授权，跳转登录
          break
        case 403:
          console.error('拒绝访问')
          break
        case 404:
          console.error('请求资源不存在')
          break
        case 500:
          console.error('服务器内部错误')
          break
        default:
          console.error(`请求错误: ${response.status}`)
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('请求超时')
    } else {
      console.error('网络连接异常')
    }
    return Promise.reject(error)
  }
)

export default request
