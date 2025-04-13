import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import CurrentWeather from '@/components/dashboard/CurrentWeather';
import AirQuality from '@/components/dashboard/AirQuality';
import { ResponsiveLineChart, ResponsiveBarChart, ResponsiveAreaChart } from '@/lib/charts';
import { WeatherData, AirQualityData } from '@/types';
import { useUser } from '@/components/UserContext';

const Weather = () => {
  const [activeTab, setActiveTab] = useState('current');
  const { user } = useUser();

  // Fetch weather data
  const { data: weatherData, isLoading: weatherLoading } = useQuery({
    queryKey: ['/api/weather/current'],
    enabled: true,
  });

  // Fetch air quality data
  const { data: airQualityData, isLoading: airQualityLoading } = useQuery({
    queryKey: ['/api/weather/air-quality'],
    enabled: true,
  });

  // Fetch forecast data
  const { data: forecastData, isLoading: forecastLoading } = useQuery({
    queryKey: ['/api/weather/forecast'],
    enabled: activeTab === 'forecast',
  });

  // Fetch historical data
  const { data: historicalData, isLoading: historicalLoading } = useQuery({
    queryKey: ['/api/weather/historical'],
    enabled: activeTab === 'historical',
  });

  // Helper function to format historical chart data
  const formatHistoricalChartData = (data: any) => {
    console.log('Historical data received:', data);
    
    if (!data || !data.daily) {
      console.log('No daily data available in historical data');
      return [];
    }
    
    // Check if time array exists
    if (!data.daily.time || !Array.isArray(data.daily.time) || data.daily.time.length === 0) {
      console.log('No time data available in historical data');
      return [];
    }
    
    // Handle different possible temperature property names
    const temperatureData = 
      data.daily.temperature_mean || 
      data.daily.temperature_2m_mean || 
      data.daily.temperature_2m || 
      data.daily.temperature_max || 
      data.daily.temperature_2m_max ||
      [];
    
    // Handle different possible precipitation property names
    const precipitationData = 
      data.daily.precipitation_sum || 
      data.daily.precipitation ||
      [];
    
    if (temperatureData.length === 0 && precipitationData.length === 0) {
      console.log('Missing temperature or precipitation data in historical data');
      return [];
    }
    
    return data.daily.time.map((date: string, i: number) => ({
      name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      temperature: temperatureData[i] || 0,
      precipitation: precipitationData[i] || 0,
    }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h2 className="text-2xl font-heading font-semibold mb-6">Weather in Hanoi</h2>
        
        <Tabs defaultValue="current" value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="current">Current Weather</TabsTrigger>
            <TabsTrigger value="forecast">7-Day Forecast</TabsTrigger>
            <TabsTrigger value="historical">Historical Data</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <CurrentWeather 
                data={weatherData as WeatherData}
                isLoading={weatherLoading}
                className="col-span-2"
              />
              <AirQuality 
                data={airQualityData as AirQualityData}
                isLoading={airQualityLoading}
                userProfile={user?.userProfile}
              />
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Hourly Forecast</CardTitle>
                <CardDescription>24-hour temperature and precipitation forecast</CardDescription>
              </CardHeader>
              <CardContent>
                {weatherLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <>
                    {console.log('Weather hourly data:', weatherData?.hourly)}
                    <ResponsiveLineChart
                      data={(weatherData?.hourly?.time || []).slice(0, 24).map((time: string, i: number) => ({
                        name: new Date(time).getHours(),
                        temperature: weatherData?.hourly?.temperature_2m?.[i] || weatherData?.hourly?.temperature?.[i] || 0,
                        "feels_like": weatherData?.hourly?.apparent_temperature?.[i] || 
                                     weatherData?.hourly?.apparentTemperature?.[i] || null,
                      }))}
                      lines={[
                        { key: 'temperature', color: '#1976d2', name: 'Temperature (°C)' },
                        { key: 'feels_like', color: '#f57c00', name: 'Feels Like (°C)' },
                      ]}
                      height={300}
                      xAxisLabel="Hour of Day"
                      yAxisLabel="Temperature (°C)"
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="forecast" className="space-y-6">
            {forecastLoading ? (
              <>
                <Skeleton className="h-[200px] w-full rounded-lg mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Skeleton className="h-[300px] w-full rounded-lg" />
                  <Skeleton className="h-[300px] w-full rounded-lg" />
                </div>
              </>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>7-Day Temperature Forecast</CardTitle>
                    <CardDescription>Min, max and average temperatures for the next week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {console.log('Forecast data:', forecastData)}
                    <ResponsiveLineChart
                      data={(forecastData?.daily?.time || []).map((date: string, i: number) => {
                        // Make sure the temperature arrays exist and have data at this index
                        const min = forecastData?.daily?.temperature_2m_min?.[i] || 0;
                        const max = forecastData?.daily?.temperature_2m_max?.[i] || 0;
                        
                        return {
                          name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                          min: min,
                          max: max,
                          avg: (min + max) / 2,
                        };
                      })}
                      lines={[
                        { key: 'min', color: '#0288d1', name: 'Min Temp (°C)' },
                        { key: 'avg', color: '#f57c00', name: 'Avg Temp (°C)' },
                        { key: 'max', color: '#d32f2f', name: 'Max Temp (°C)' },
                      ]}
                      height={300}
                    />
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Precipitation Forecast</CardTitle>
                      <CardDescription>Daily precipitation probability and amount</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveBarChart
                        data={(forecastData?.daily?.time || []).map((date: string, i: number) => {
                          // Safely access data with fallbacks
                          return {
                            name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                            amount: forecastData?.daily?.precipitation_sum?.[i] || 0,
                            probability: forecastData?.daily?.precipitation_probability_max?.[i] || 0,
                          };
                        })}
                        bars={[
                          { key: 'amount', color: '#0288d1', name: 'Amount (mm)' },
                          { key: 'probability', color: '#4fc3f7', name: 'Probability (%)' }
                        ]}
                        height={250}
                      />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Weather Conditions</CardTitle>
                      <CardDescription>Daily weather conditions and wind speed</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {(forecastData?.daily?.time || []).map((date: string, i: number) => {
                          const weatherCode = forecastData?.daily?.weather_code?.[i] || 0;
                          const windSpeed = forecastData?.daily?.wind_speed_10m_max?.[i] || 
                                           forecastData?.daily?.wind_speed_max_10m?.[i] || 0;
                          const day = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
                          
                          // Map weather code to icon
                          let weatherIcon = 'help_outline'; // default
                          if (weatherCode <= 3) weatherIcon = 'wb_sunny';
                          else if (weatherCode <= 49) weatherIcon = 'cloud';
                          else if (weatherCode <= 59) weatherIcon = 'grain';
                          else if (weatherCode <= 69) weatherIcon = 'ac_unit';
                          else if (weatherCode <= 79) weatherIcon = 'ac_unit';
                          else if (weatherCode <= 82) weatherIcon = 'rainy';
                          else if (weatherCode <= 86) weatherIcon = 'ac_unit';
                          else weatherIcon = 'thunderstorm';
                          
                          return (
                            <div key={date} className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm font-medium">{day}</p>
                              <span className="material-icons text-2xl my-2">{weatherIcon}</span>
                              <div className="flex items-center">
                                <span className="material-icons text-sm mr-1">air</span>
                                <span className="text-xs">{windSpeed} km/h</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="historical" className="space-y-6">
            {historicalLoading ? (
              <Skeleton className="h-[400px] w-full rounded-lg" />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Historical Weather Data</CardTitle>
                  <CardDescription>Temperature and precipitation for the past 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveLineChart
                    data={formatHistoricalChartData(historicalData)}
                    lines={[
                      { key: 'temperature', color: '#1976d2', name: 'Temperature (°C)' },
                      { key: 'precipitation', color: '#43a047', name: 'Precipitation (mm)' },
                    ]}
                    height={350}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Weather;
